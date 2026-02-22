import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';

/**
 * Cliente Baileys - WebSocket puro, sin navegador
 * Misma interfaz que VenomClient para intercambio transparente
 */
export class BaileysClient {
  constructor(sessionId, options = {}) {
    this.sessionId = sessionId;
    this.options = options;
    this.sock = null;
    this.status = 'disconnected';
    this.qrCode = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isClosing = false;
    this.saveCreds = null;
    this.authStatePath = path.join(config.venom.sessionsDir, sessionId);
  }

  /**
   * Crea e inicializa el cliente Baileys
   */
  async create() {
    try {
      logger.info(`Creating Baileys client for session: ${this.sessionId}`);

      // Import dinámico (Baileys tiene exports ESM complejos)
      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const { DisconnectReason, useMultiFileAuthState, Browsers } = baileys;

      // QR code generator
      const QRCode = (await import('qrcode')).default;

      // Pino logger silencioso (Baileys lo requiere)
      const P = (await import('pino')).default;
      const pinoLogger = P({ level: 'silent' });

      // Asegurar directorio de auth state
      if (!fs.existsSync(this.authStatePath)) {
        fs.mkdirSync(this.authStatePath, { recursive: true });
      }

      // Cargar auth state persistido
      const { state, saveCreds } = await useMultiFileAuthState(this.authStatePath);
      this.saveCreds = saveCreds;

      // Crear socket WebSocket (NO navegador)
      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pinoLogger,
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: true
      });

      // Guardar refs para reconexión
      this._baileys = baileys;
      this._QRCode = QRCode;
      this._pinoLogger = pinoLogger;

      this._setupEventListeners(DisconnectReason, QRCode);

      logger.info(`Baileys client created for session: ${this.sessionId}`);
      return this.sock;

    } catch (error) {
      logger.error(`Failed to create Baileys client for ${this.sessionId}:`, error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Configura event listeners
   */
  _setupEventListeners(DisconnectReason, QRCode) {
    // Actualización de conexión (QR, connected, disconnected)
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR generado
      if (qr) {
        try {
          this.qrCode = await QRCode.toDataURL(qr);
          this.status = 'qr_ready';
          logger.info(`QR generated for Baileys session: ${this.sessionId}`);

          if (this.options.onQR) {
            this.options.onQR(this.qrCode);
          }
        } catch (err) {
          logger.error(`QR generation error: ${err.message}`);
        }
      }

      // Conectado
      if (connection === 'open') {
        this.status = 'connected';
        this.reconnectAttempts = 0;
        this.qrCode = null;
        logger.info(`Baileys session connected: ${this.sessionId}`);

        if (this.options.onStatus) {
          this.options.onStatus('open', this.sessionId);
        }
      }

      // Desconectado
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.info(`Baileys session closed: ${this.sessionId} (code: ${statusCode}, reconnect: ${shouldReconnect})`);

        if (this.options.onStatus) {
          this.options.onStatus('close', this.sessionId);
        }

        if (shouldReconnect && !this.isClosing) {
          this.status = 'disconnected';
          this.handleReconnect();
        } else {
          this.status = 'disconnected';
          // Si logout, limpiar auth state
          if (statusCode === DisconnectReason.loggedOut) {
            this._cleanAuthState();
          }
        }
      }
    });

    // Persistir credenciales
    this.sock.ev.on('creds.update', this.saveCreds);

    // Mensajes entrantes
    this.sock.ev.on('messages.upsert', (m) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (msg.key.fromMe) continue;
        if (msg.key.remoteJid === 'status@broadcast') continue;

        logger.info(`Baileys message in ${this.sessionId}: ${msg.key.remoteJid}`);

        if (this.options.onMessage) {
          this.options.onMessage(msg);
        }
      }
    });
  }

  /**
   * Reconexión con backoff exponencial
   */
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnect attempts for ${this.sessionId}`);
      this.status = 'error';
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    logger.info(`Reconnecting ${this.sessionId} in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.create();
      } catch (error) {
        logger.error(`Reconnect failed for ${this.sessionId}:`, error);
      }
    }, delay);
  }

  /**
   * Envía mensaje de texto
   */
  async sendText(to, message) {
    if (!this.sock) throw new Error('Client not initialized');

    try {
      // Timeout de 15 segundos para evitar cuelgues indefinidos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Send timeout (15s)')), 15000)
      );

      const sendPromise = this.sock.sendMessage(to, { text: message });

      const result = await Promise.race([sendPromise, timeoutPromise]);
      logger.info(`Message sent to ${to} from ${this.sessionId}`);
      return result;
    } catch (error) {
      logger.error(`Send failed from ${this.sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Envía imagen (URL, base64, o path)
   */
  async sendImage(to, pathOrUrl, filename, caption) {
    if (!this.sock) throw new Error('Client not initialized');

    let imagePayload;

    if (pathOrUrl.startsWith('http')) {
      imagePayload = { image: { url: pathOrUrl }, caption: caption || '' };
    } else if (pathOrUrl.startsWith('data:')) {
      const base64Data = pathOrUrl.split(',')[1];
      imagePayload = { image: Buffer.from(base64Data, 'base64'), caption: caption || '' };
    } else {
      imagePayload = { image: fs.readFileSync(pathOrUrl), caption: caption || '' };
    }

    return await this.sock.sendMessage(to, imagePayload);
  }

  /**
   * Envía archivo/documento
   */
  async sendFile(to, pathOrUrl, filename, caption) {
    if (!this.sock) throw new Error('Client not initialized');

    let docPayload;

    if (pathOrUrl.startsWith('http')) {
      docPayload = { document: { url: pathOrUrl }, fileName: filename || 'file', caption: caption || '' };
    } else {
      docPayload = { document: fs.readFileSync(pathOrUrl), fileName: filename || 'file', caption: caption || '' };
    }

    return await this.sock.sendMessage(to, docPayload);
  }

  /**
   * Envía video
   */
  async sendVideo(to, pathOrUrl, caption) {
    if (!this.sock) throw new Error('Client not initialized');

    let videoPayload;

    if (pathOrUrl.startsWith('http')) {
      videoPayload = { video: { url: pathOrUrl }, caption: caption || '' };
    } else {
      videoPayload = { video: fs.readFileSync(pathOrUrl), caption: caption || '' };
    }

    return await this.sock.sendMessage(to, videoPayload);
  }

  /**
   * Envía audio (voice note)
   */
  async sendAudio(to, pathOrUrl) {
    if (!this.sock) throw new Error('Client not initialized');

    let audioPayload;

    if (pathOrUrl.startsWith('http')) {
      audioPayload = { audio: { url: pathOrUrl }, ptt: true };
    } else {
      audioPayload = { audio: fs.readFileSync(pathOrUrl), ptt: true };
    }

    return await this.sock.sendMessage(to, audioPayload);
  }

  /**
   * Solicita código de emparejamiento (alternativa a QR)
   */
  async requestPairingCode(phoneNumber) {
    if (!this.sock) throw new Error('Client not initialized');
    if (this.status === 'connected') throw new Error('Already connected');

    const code = await this.sock.requestPairingCode(phoneNumber);
    logger.info(`Pairing code for ${this.sessionId}: ${code}`);
    return code;
  }

  /**
   * Estado de conexión
   */
  async getConnectionState() {
    if (!this.sock) return 'disconnected';
    return this.status === 'connected' ? 'open' : this.status;
  }

  /**
   * Info del dispositivo conectado
   */
  async getHostDevice() {
    if (!this.sock) return null;
    try {
      return this.sock.user || null;
    } catch {
      return null;
    }
  }

  /**
   * Desconectar sin eliminar auth state (para reinicios graceful)
   */
  async disconnect() {
    this.isClosing = true;
    if (this.sock) {
      this.sock.end(undefined);
    }
    this.sock = null;
    this.status = 'disconnected';
    logger.info(`Baileys client disconnected (graceful): ${this.sessionId}`);
  }

  /**
   * Cierra y elimina la sesión completamente
   */
  async close() {
    this.isClosing = true;

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch {
        try { this.sock.end(undefined); } catch { /* ignore */ }
      }
    }

    this._cleanAuthState();
    this.sock = null;
    this.status = 'disconnected';
    logger.info(`Baileys client closed (full cleanup): ${this.sessionId}`);
  }

  /**
   * Elimina archivos de auth state
   */
  _cleanAuthState() {
    try {
      if (fs.existsSync(this.authStatePath)) {
        fs.rmSync(this.authStatePath, { recursive: true, force: true });
        logger.info(`Auth state cleaned for: ${this.sessionId}`);
      }
    } catch (err) {
      logger.warn(`Could not clean auth state: ${err.message}`);
    }
  }

  getQR() {
    return this.qrCode;
  }

  getStatus() {
    return this.status;
  }
}

export default BaileysClient;
