import { VenomClient } from './venom-client.js';
import { EventTransformer } from './event-transformer.js';
import webhookSender from './webhook-sender.js';
import redisClient from '../redis/client.js';
import logger from '../utils/logger.js';
import { config } from '../config/env.js';
import {
  SessionNotFoundError,
  SessionAlreadyExistsError,
  MaxSessionsReachedError
} from '../utils/errors.js';

/**
 * Gestiona múltiples sesiones de Venom en memoria
 * con respaldo en Redis para persistencia
 */
export class SessionManager {
  constructor() {
    // Map en memoria: sessionId → VenomClient
    this.sessions = new Map();

    // Cache de webhooks: sessionId → webhookUrl
    this.webhooks = new Map();

    // Cache de metadatos: sessionId → { userId, createdAt, etc }
    this.metadata = new Map();
  }

  /**
   * Inicializa el SessionManager y restaura sesiones de Redis
   */
  async initialize() {
    try {
      await redisClient.connect();
      logger.info('SessionManager initialized');

      // Restaurar sesiones activas desde Redis (opcional)
      await this.restoreSessionsFromRedis();

    } catch (error) {
      logger.error('Failed to initialize SessionManager:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva sesión
   */
  async createSession(sessionId, userId, options = {}) {
    try {
      // Validar que no exista
      if (this.sessions.has(sessionId)) {
        throw new SessionAlreadyExistsError(sessionId);
      }

      // Validar límite de sesiones
      if (this.sessions.size >= config.venom.maxSessions) {
        throw new MaxSessionsReachedError(config.venom.maxSessions);
      }

      logger.info(`Creating session: ${sessionId} for user: ${userId}`);

      // Guardar webhook si se proporciona
      if (options.webhookUrl) {
        this.webhooks.set(sessionId, options.webhookUrl);
      }

      // Guardar metadata
      this.metadata.set(sessionId, {
        userId,
        createdAt: Date.now(),
        ...options.metadata
      });

      // Crear cliente Venom con callbacks
      const client = new VenomClient(sessionId, {
        onQR: (base64Qr, asciiQR) => this.handleQR(sessionId, base64Qr),
        onStatus: (status, session) => this.handleStatusChange(sessionId, status, session),
        onMessage: (message) => this.handleMessage(sessionId, message)
      });

      // Inicializar cliente
      await client.create();

      // Guardar en memoria
      this.sessions.set(sessionId, client);

      // Guardar en Redis
      await redisClient.set(`venom:session:${sessionId}`, {
        userId,
        status: 'connecting',
        createdAt: Date.now(),
        webhookUrl: options.webhookUrl
      }, { EX: 7200 }); // 2 horas

      logger.info(`Session created successfully: ${sessionId}`);

      return {
        sessionId,
        status: client.getStatus(),
        userId
      };

    } catch (error) {
      logger.error(`Failed to create session ${sessionId}:`, error);

      // Cleanup en caso de error
      this.sessions.delete(sessionId);
      this.webhooks.delete(sessionId);
      this.metadata.delete(sessionId);

      throw error;
    }
  }

  /**
   * Obtiene una sesión existente
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    return session;
  }

  /**
   * Elimina una sesión
   */
  async deleteSession(sessionId) {
    try {
      logger.info(`Deleting session: ${sessionId}`);

      const session = this.sessions.get(sessionId);

      if (session) {
        // Cerrar cliente Venom
        await session.close();
      }

      // Eliminar de memoria
      this.sessions.delete(sessionId);
      this.webhooks.delete(sessionId);
      this.metadata.delete(sessionId);

      // Eliminar de Redis
      await redisClient.del(`venom:session:${sessionId}`);

      logger.info(`Session deleted: ${sessionId}`);

      return { success: true };

    } catch (error) {
      logger.error(`Failed to delete session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el QR code de una sesión
   */
  async getQR(sessionId) {
    const session = this.getSession(sessionId);
    const qr = session.getQR();

    if (!qr) {
      throw new Error('QR code not available yet');
    }

    return {
      qr: qr,
      base64: qr
    };
  }

  /**
   * Obtiene el estado de una sesión
   */
  async getStatus(sessionId) {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        // Verificar en Redis si existía
        const redisData = await redisClient.get(`venom:session:${sessionId}`);

        if (redisData) {
          return {
            status: 'disconnected',
            lastSeen: redisData.createdAt,
            inMemory: false
          };
        }

        throw new SessionNotFoundError(sessionId);
      }

      const connectionState = await session.getConnectionState();
      const hostDevice = await session.getHostDevice();

      return {
        status: session.getStatus(),
        connectionState,
        hostDevice,
        qrAvailable: !!session.getQR(),
        inMemory: true
      };

    } catch (error) {
      logger.error(`Failed to get status for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza el webhook URL de una sesión
   */
  async updateWebhook(sessionId, webhookUrl) {
    try {
      if (!this.sessions.has(sessionId)) {
        throw new SessionNotFoundError(sessionId);
      }

      logger.info(`Updating webhook for session ${sessionId}: ${webhookUrl}`);

      // Actualizar en memoria
      this.webhooks.set(sessionId, webhookUrl);

      // Actualizar en Redis
      const redisKey = `venom:session:${sessionId}`;
      const redisData = await redisClient.get(redisKey);

      if (redisData) {
        redisData.webhookUrl = webhookUrl;
        redisData.lastUpdate = Date.now();
        await redisClient.set(redisKey, redisData, { EX: 7200 });
      }

      logger.info(`Webhook updated for session ${sessionId}`);

      return {
        success: true,
        sessionId,
        webhookUrl
      };

    } catch (error) {
      logger.error(`Failed to update webhook for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Lista todas las sesiones activas
   */
  async listSessions() {
    const sessions = [];

    for (const [sessionId, client] of this.sessions) {
      const metadata = this.metadata.get(sessionId);

      sessions.push({
        sessionId,
        status: client.getStatus(),
        userId: metadata?.userId,
        createdAt: metadata?.createdAt,
        webhookUrl: this.webhooks.get(sessionId)
      });
    }

    return sessions;
  }

  /**
   * Envía un mensaje desde una sesión
   */
  async sendMessage(sessionId, to, message, type = 'text') {
    const session = this.getSession(sessionId);

    switch (type) {
      case 'text':
        return await session.sendText(to, message);

      case 'image':
        return await session.sendImage(to, message.path, message.filename, message.caption);

      case 'file':
        return await session.sendFile(to, message.path, message.filename, message.caption);

      default:
        throw new Error(`Unsupported message type: ${type}`);
    }
  }

  /**
   * Handler: QR code generado
   */
  async handleQR(sessionId, qr) {
    logger.info(`QR generated for session: ${sessionId}`);

    try {
      // Actualizar estado en Redis
      await redisClient.set(`venom:session:${sessionId}:qr`, qr, { EX: 300 }); // 5 minutos

      // Enviar webhook si está configurado
      const webhookUrl = this.webhooks.get(sessionId);

      if (webhookUrl) {
        const payload = EventTransformer.qrToBaileys(qr, sessionId);
        await webhookSender.send(webhookUrl, payload);
      }

    } catch (error) {
      logger.error(`Error handling QR for ${sessionId}:`, error);
    }
  }

  /**
   * Handler: Cambio de estado de conexión
   */
  async handleStatusChange(sessionId, status, session) {
    logger.info(`Status changed for ${sessionId}: ${status}`);

    try {
      // Actualizar en Redis
      const redisData = await redisClient.get(`venom:session:${sessionId}`);

      if (redisData) {
        redisData.status = status;
        redisData.lastUpdate = Date.now();
        await redisClient.set(`venom:session:${sessionId}`, redisData, { EX: 7200 });
      }

      // Enviar webhook de conexión
      const webhookUrl = this.webhooks.get(sessionId);

      if (webhookUrl) {
        const payload = EventTransformer.connectionToBaileys(status, sessionId);
        await webhookSender.send(webhookUrl, payload);
      }

    } catch (error) {
      logger.error(`Error handling status change for ${sessionId}:`, error);
    }
  }

  /**
   * Handler: Mensaje recibido
   */
  async handleMessage(sessionId, message) {
    logger.info(`Message received in session ${sessionId}:`, {
      from: message.from,
      type: message.type,
      isGroupMsg: message.isGroupMsg
    });

    try {
      // Transformar a formato Baileys
      const baileyMessage = EventTransformer.messageToBaileys(message, sessionId);

      // Enviar webhook
      const webhookUrl = this.webhooks.get(sessionId);

      if (webhookUrl) {
        await webhookSender.send(webhookUrl, baileyMessage);
      }

      // Guardar en Redis para debugging (opcional)
      await redisClient.set(
        `venom:message:${sessionId}:${message.id}`,
        { message: baileyMessage, receivedAt: Date.now() },
        { EX: 3600 } // 1 hora
      );

    } catch (error) {
      logger.error(`Error handling message for ${sessionId}:`, error);
    }
  }

  /**
   * Restaura sesiones desde Redis (opcional, para recuperación)
   */
  async restoreSessionsFromRedis() {
    try {
      const keys = await redisClient.keys('venom:session:*');

      logger.info(`Found ${keys.length} sessions in Redis`);

      // Por ahora solo log, no restauramos automáticamente
      // En producción podrías implementar lógica de restauración

    } catch (error) {
      logger.error('Failed to restore sessions from Redis:', error);
    }
  }

  /**
   * Limpia sesiones inactivas
   */
  async cleanupInactiveSessions(inactiveThresholdMs = 3600000) {
    const now = Date.now();
    const sessionsToDelete = [];

    for (const [sessionId, metadata] of this.metadata) {
      const session = this.sessions.get(sessionId);

      if (!session || session.getStatus() === 'error') {
        const inactiveTime = now - (metadata.createdAt || 0);

        if (inactiveTime > inactiveThresholdMs) {
          sessionsToDelete.push(sessionId);
        }
      }
    }

    for (const sessionId of sessionsToDelete) {
      logger.info(`Cleaning up inactive session: ${sessionId}`);
      await this.deleteSession(sessionId);
    }

    return sessionsToDelete.length;
  }
}

// Exportar instancia singleton
export const sessionManager = new SessionManager();
export default sessionManager;
