import venom from 'venom-bot';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

/**
 * Wrapper del cliente Venom con manejo de errores y reconexión
 */
export class VenomClient {
  constructor(sessionId, options = {}) {
    this.sessionId = sessionId;
    this.options = options;
    this.client = null;
    this.status = 'disconnected';
    this.qrCode = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isClosing = false;
  }

  /**
   * Crea e inicializa el cliente Venom
   */
  async create() {
    try {
      logger.info(`Creating Venom client for session: ${this.sessionId}`);

      const sessionPath = path.join(config.venom.sessionsDir, this.sessionId);

      // LIMPIEZA COMPLETA: Eliminar TODO el directorio de sesión para empezar limpio
      try {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          logger.info(`Cleaned session directory for: ${this.sessionId}`);
        }
      } catch (cleanError) {
        logger.warn(`Could not clean session directory: ${cleanError.message}`);
      }

      this.client = await venom.create(
        this.sessionId,
        (base64Qr, asciiQR) => {
          this.qrCode = base64Qr;
          this.status = 'qr_ready';

          logger.info(`QR Code generated for session: ${this.sessionId}`);

          if (this.options.onQR) {
            this.options.onQR(base64Qr, asciiQR);
          }
        },
        (statusSession, session) => {
          this.status = this.mapStatus(statusSession);

          logger.info(`Session status changed: ${this.sessionId} -> ${statusSession}`);

          if (this.options.onStatus) {
            this.options.onStatus(statusSession, session);
          }

          // Manejar reconexión automática
          if (statusSession === 'desconnectedMobile' && !this.isClosing) {
            this.handleReconnect();
          }
        },
        {
          headless: config.venom.headless,
          useChrome: config.venom.useChrome,
          logQR: config.venom.logQR,
          browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-features=TranslateUI,BlinkGenPropertyTrees',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--mute-audio'
          ],
          folderNameToken: sessionPath,
          mkdirFolderToken: sessionPath,
          autoClose: 60000 * 2, // 2 minutos de inactividad
          disableSpins: true,
          disableWelcome: true,
          // Evitar bloqueo de perfil
          userDataDir: sessionPath
        }
      );

      this.status = 'connected';
      this.reconnectAttempts = 0;

      logger.info(`Venom client created successfully: ${this.sessionId}`);

      // Configurar event listeners
      this.setupEventListeners();

      return this.client;

    } catch (error) {
      logger.error(`Failed to create Venom client for ${this.sessionId}:`, error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Configura event listeners del cliente
   */
  setupEventListeners() {
    if (!this.client) return;

    // Listener para mensajes
    if (this.options.onMessage) {
      this.client.onMessage((message) => {
        this.options.onMessage(message);
      });
    }

    // Listener para cambios de estado
    if (this.options.onStateChange) {
      this.client.onStateChange((state) => {
        this.options.onStateChange(state);
      });
    }
  }

  /**
   * Maneja la reconexión automática con backoff exponencial
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnect attempts reached for ${this.sessionId}`);
      this.status = 'error';
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    logger.info(`Attempting reconnect for ${this.sessionId} in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.create();
      } catch (error) {
        logger.error(`Reconnect failed for ${this.sessionId}:`, error);
      }
    }, delay);
  }

  /**
   * Envía un mensaje de texto
   */
  async sendText(to, message) {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const result = await this.client.sendText(to, message);
      logger.info(`Message sent to ${to} from session ${this.sessionId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send message from ${this.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Envía una imagen
   */
  async sendImage(to, pathOrBase64, filename, caption) {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    return await this.client.sendImage(to, pathOrBase64, filename, caption);
  }

  /**
   * Envía un archivo
   */
  async sendFile(to, pathOrBase64, filename, caption) {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    return await this.client.sendFile(to, pathOrBase64, filename, caption);
  }

  /**
   * Obtiene el estado de la conexión
   */
  async getConnectionState() {
    if (!this.client) {
      return 'disconnected';
    }

    try {
      const state = await this.client.getConnectionState();
      return state;
    } catch (error) {
      logger.error(`Failed to get connection state for ${this.sessionId}:`, error);
      return 'error';
    }
  }

  /**
   * Obtiene información del dispositivo conectado
   */
  async getHostDevice() {
    if (!this.client) {
      return null;
    }

    try {
      return await this.client.getHostDevice();
    } catch (error) {
      logger.error(`Failed to get host device for ${this.sessionId}:`, error);
      return null;
    }
  }

  /**
   * Cierra el cliente
   */
  async close() {
    this.isClosing = true;

    if (this.client) {
      try {
        await this.client.close();
        logger.info(`Venom client closed: ${this.sessionId}`);
      } catch (error) {
        logger.error(`Error closing Venom client ${this.sessionId}:`, error);
      }
    }

    this.client = null;
    this.status = 'disconnected';
  }

  /**
   * Mapea estados de Venom a estados internos
   */
  mapStatus(venomStatus) {
    const statusMap = {
      'isLogged': 'connected',
      'notLogged': 'disconnected',
      'browserClose': 'disconnected',
      'qrReadSuccess': 'connecting',
      'qrReadFail': 'error',
      'autocloseCalled': 'disconnected',
      'desconnectedMobile': 'disconnected',
      'deleteToken': 'disconnected'
    };

    return statusMap[venomStatus] || 'unknown';
  }

  /**
   * Obtiene el QR code actual
   */
  getQR() {
    return this.qrCode;
  }

  /**
   * Obtiene el estado actual
   */
  getStatus() {
    return this.status;
  }
}

export default VenomClient;
