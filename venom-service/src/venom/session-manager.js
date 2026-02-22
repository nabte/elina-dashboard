import { BaileysClient } from '../baileys/baileys-client.js';
import { EventTransformer } from './event-transformer.js';

// Venom: import condicional (ya no es dependencia principal)
let VenomClient = null;
try {
  const mod = await import('./venom-client.js');
  VenomClient = mod.VenomClient;
} catch {
  // venom-bot no instalado - solo Baileys disponible
}
import webhookSender from './webhook-sender.js';
import redisClient from '../redis/client.js';
import logger from '../utils/logger.js';
import { config } from '../config/env.js';
import fs from 'fs';
import path from 'path';
import {
  SessionNotFoundError,
  SessionAlreadyExistsError,
  MaxSessionsReachedError
} from '../utils/errors.js';

/**
 * Gestiona múltiples sesiones WhatsApp (Venom + Baileys)
 */
export class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.webhooks = new Map();
    this.metadata = new Map();
  }

  async initialize() {
    try {
      await redisClient.connect();
      logger.info('SessionManager initialized');
      await this.restoreSessionsFromRedis();
    } catch (error) {
      logger.error('Failed to initialize SessionManager:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva sesión
   * @param {string} options.provider - 'baileys' (default) o 'venom'
   */
  async createSession(sessionId, userId, options = {}) {
    try {
      const provider = options.provider || 'baileys';

      if (this.sessions.has(sessionId)) {
        throw new SessionAlreadyExistsError(sessionId);
      }

      if (this.sessions.size >= config.venom.maxSessions) {
        throw new MaxSessionsReachedError(config.venom.maxSessions);
      }

      logger.info(`Creating ${provider} session: ${sessionId} for user: ${userId}`);

      if (options.webhookUrl) {
        this.webhooks.set(sessionId, options.webhookUrl);
      }

      this.metadata.set(sessionId, {
        userId,
        provider,
        createdAt: Date.now(),
        ...options.metadata
      });

      let client;

      if (provider === 'baileys') {
        client = new BaileysClient(sessionId, {
          onQR: (base64Qr) => this.handleQR(sessionId, base64Qr),
          onStatus: (status) => this.handleBaileysStatusChange(sessionId, status),
          onMessage: (message) => this.handleBaileysMessage(sessionId, message)
        });
      } else if (VenomClient) {
        client = new VenomClient(sessionId, {
          onQR: (base64Qr, asciiQR) => this.handleQR(sessionId, base64Qr),
          onStatus: (status, session) => this.handleStatusChange(sessionId, status, session),
          onMessage: (message) => this.handleMessage(sessionId, message)
        });
      } else {
        throw new Error('Venom no está instalado. Usa provider: "baileys"');
      }

      await client.create();
      this.sessions.set(sessionId, client);

      // Redis: sin TTL para Baileys (persiste), 2h para Venom
      const redisOptions = provider === 'venom' ? { EX: 7200 } : {};
      await redisClient.set(`venom:session:${sessionId}`, {
        userId,
        provider,
        status: 'connecting',
        createdAt: Date.now(),
        webhookUrl: options.webhookUrl
      }, redisOptions);

      logger.info(`Session created (${provider}): ${sessionId}`);

      return {
        sessionId,
        provider,
        status: client.getStatus(),
        userId
      };

    } catch (error) {
      logger.error(`Failed to create session ${sessionId}:`, error);
      this.sessions.delete(sessionId);
      this.webhooks.delete(sessionId);
      this.metadata.delete(sessionId);
      throw error;
    }
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);
    return session;
  }

  async deleteSession(sessionId) {
    try {
      logger.info(`Deleting session: ${sessionId}`);
      const session = this.sessions.get(sessionId);

      if (session) {
        await session.close();
      }

      this.sessions.delete(sessionId);
      this.webhooks.delete(sessionId);
      this.metadata.delete(sessionId);
      await redisClient.del(`venom:session:${sessionId}`);

      logger.info(`Session deleted: ${sessionId}`);
      return { success: true };

    } catch (error) {
      logger.error(`Failed to delete session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Desconecta sin eliminar auth state (shutdown graceful de Baileys)
   */
  async disconnectSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (session && session.disconnect) {
        await session.disconnect();
      }
      this.sessions.delete(sessionId);
      logger.info(`Session disconnected (graceful): ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to disconnect session ${sessionId}:`, error);
    }
  }

  async getQR(sessionId) {
    const session = this.getSession(sessionId);
    const qr = session.getQR();

    if (!qr) {
      throw new Error('QR code not available yet');
    }

    return { qr, base64: qr };
  }

  /**
   * Solicita pairing code (solo Baileys)
   */
  async getPairingCode(sessionId, phoneNumber) {
    const session = this.getSession(sessionId);
    const metadata = this.metadata.get(sessionId);

    if (metadata?.provider !== 'baileys') {
      throw new Error('Pairing code solo disponible con Baileys');
    }

    if (!session.requestPairingCode) {
      throw new Error('Session does not support pairing code');
    }

    const code = await session.requestPairingCode(phoneNumber);
    return { code, sessionId };
  }

  async getStatus(sessionId) {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        const redisData = await redisClient.get(`venom:session:${sessionId}`);
        if (redisData) {
          return {
            status: 'disconnected',
            provider: redisData.provider || 'venom',
            lastSeen: redisData.createdAt,
            inMemory: false
          };
        }
        throw new SessionNotFoundError(sessionId);
      }

      const metadata = this.metadata.get(sessionId);
      const connectionState = await session.getConnectionState();
      const hostDevice = await session.getHostDevice();

      return {
        status: session.getStatus(),
        provider: metadata?.provider || 'unknown',
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

  async updateWebhook(sessionId, webhookUrl) {
    try {
      if (!this.sessions.has(sessionId)) {
        throw new SessionNotFoundError(sessionId);
      }

      logger.info(`Updating webhook for ${sessionId}: ${webhookUrl}`);
      this.webhooks.set(sessionId, webhookUrl);

      const redisKey = `venom:session:${sessionId}`;
      const redisData = await redisClient.get(redisKey);
      if (redisData) {
        redisData.webhookUrl = webhookUrl;
        redisData.lastUpdate = Date.now();
        const metadata = this.metadata.get(sessionId);
        const redisOptions = metadata?.provider === 'venom' ? { EX: 7200 } : {};
        await redisClient.set(redisKey, redisData, redisOptions);
      }

      return { success: true, sessionId, webhookUrl };

    } catch (error) {
      logger.error(`Failed to update webhook for ${sessionId}:`, error);
      throw error;
    }
  }

  async listSessions() {
    const sessions = [];

    for (const [sessionId, client] of this.sessions) {
      const metadata = this.metadata.get(sessionId);

      sessions.push({
        sessionId,
        status: client.getStatus(),
        provider: metadata?.provider || 'unknown',
        userId: metadata?.userId,
        createdAt: metadata?.createdAt,
        webhookUrl: this.webhooks.get(sessionId)
      });
    }

    return sessions;
  }

  async sendMessage(sessionId, to, message, type = 'text') {
    const session = this.getSession(sessionId);

    switch (type) {
      case 'text':
        return await session.sendText(to, message);
      case 'image':
        return await session.sendImage(to, message.path, message.filename, message.caption);
      case 'video':
        return await session.sendVideo(to, message.path, message.caption);
      case 'audio':
        return await session.sendAudio(to, message.path);
      case 'file':
        return await session.sendFile(to, message.path, message.filename, message.caption);
      default:
        throw new Error(`Unsupported message type: ${type}`);
    }
  }

  // ==========================================
  // HANDLERS COMPARTIDOS
  // ==========================================

  async handleQR(sessionId, qr) {
    logger.info(`QR generated for session: ${sessionId}`);

    try {
      await redisClient.set(`venom:session:${sessionId}:qr`, qr, { EX: 300 });

      const webhookUrl = this.webhooks.get(sessionId);
      if (webhookUrl) {
        const payload = EventTransformer.qrToBaileys(qr, sessionId);
        await webhookSender.send(webhookUrl, payload);
      }
    } catch (error) {
      logger.error(`Error handling QR for ${sessionId}:`, error);
    }
  }

  // ==========================================
  // HANDLERS VENOM (transforman a formato Baileys)
  // ==========================================

  async handleStatusChange(sessionId, status, session) {
    logger.info(`Venom status changed for ${sessionId}: ${status}`);

    try {
      const redisData = await redisClient.get(`venom:session:${sessionId}`);
      if (redisData) {
        redisData.status = status;
        redisData.lastUpdate = Date.now();
        await redisClient.set(`venom:session:${sessionId}`, redisData, { EX: 7200 });
      }

      const webhookUrl = this.webhooks.get(sessionId);
      if (webhookUrl) {
        const payload = EventTransformer.connectionToBaileys(status, sessionId);
        await webhookSender.send(webhookUrl, payload);
      }
    } catch (error) {
      logger.error(`Error handling status for ${sessionId}:`, error);
    }
  }

  async handleMessage(sessionId, message) {
    logger.info(`Venom message in ${sessionId}:`, {
      from: message.from,
      type: message.type,
      isGroupMsg: message.isGroupMsg
    });

    try {
      const baileyMessage = EventTransformer.messageToBaileys(message, sessionId);
      const webhookUrl = this.webhooks.get(sessionId);
      if (webhookUrl) {
        await webhookSender.send(webhookUrl, baileyMessage);
      }

      await redisClient.set(
        `venom:message:${sessionId}:${message.id}`,
        { message: baileyMessage, receivedAt: Date.now() },
        { EX: 3600 }
      );
    } catch (error) {
      logger.error(`Error handling Venom message for ${sessionId}:`, error);
    }
  }

  // ==========================================
  // HANDLERS BAILEYS (formato nativo)
  // ==========================================

  async handleBaileysStatusChange(sessionId, connectionState) {
    logger.info(`Baileys status for ${sessionId}: ${connectionState}`);

    try {
      const redisData = await redisClient.get(`venom:session:${sessionId}`);
      if (redisData) {
        redisData.status = connectionState;
        redisData.lastUpdate = Date.now();
        await redisClient.set(`venom:session:${sessionId}`, redisData);
      }

      const webhookUrl = this.webhooks.get(sessionId);
      if (webhookUrl) {
        const payload = {
          event: 'CONNECTION_UPDATE',
          instance: sessionId,
          data: { state: connectionState }
        };
        await webhookSender.send(webhookUrl, payload);
      }
    } catch (error) {
      logger.error(`Error handling Baileys status for ${sessionId}:`, error);
    }
  }

  async handleBaileysMessage(sessionId, message) {
    logger.info(`Baileys message in ${sessionId}: ${message.key?.remoteJid}`);

    try {
      const payload = {
        event: 'MESSAGES_UPSERT',
        instance: sessionId,
        data: message
      };

      const webhookUrl = this.webhooks.get(sessionId);
      if (webhookUrl) {
        await webhookSender.send(webhookUrl, payload);
      }

      await redisClient.set(
        `venom:message:${sessionId}:${message.key?.id}`,
        { message: payload, receivedAt: Date.now() },
        { EX: 3600 }
      );
    } catch (error) {
      logger.error(`Error handling Baileys message for ${sessionId}:`, error);
    }
  }

  // ==========================================
  // RESTAURACIÓN DE SESIONES BAILEYS
  // ==========================================

  async restoreSessionsFromRedis() {
    try {
      const sessionsDir = config.venom.sessionsDir;
      if (!fs.existsSync(sessionsDir)) {
        logger.info('Sessions directory not found, skipping restore');
        return;
      }

      const dirs = fs.readdirSync(sessionsDir);
      let restored = 0;

      for (const dir of dirs) {
        const credsPath = path.join(sessionsDir, dir, 'creds.json');
        if (!fs.existsSync(credsPath)) continue;

        // Intentar obtener metadata de Redis primero
        let redisData = await redisClient.get(`venom:session:${dir}`);

        // Si no está en Redis pero existe auth state, restaurar de todos modos
        // (asumiendo que es Baileys, ya que Venom no persiste auth states)
        if (!redisData) {
          logger.info(`Found orphaned auth state for ${dir}, assuming Baileys session`);
          redisData = {
            provider: 'baileys',
            userId: 'unknown', // Se actualizará cuando se use
            webhookUrl: config.venom.defaultWebhookUrl || null,
            createdAt: Date.now()
          };
        }

        if (redisData.provider !== 'baileys') continue;

        logger.info(`Restoring Baileys session: ${dir}`);

        try {
          if (redisData.webhookUrl) {
            this.webhooks.set(dir, redisData.webhookUrl);
          }

          this.metadata.set(dir, {
            userId: redisData.userId,
            provider: 'baileys',
            createdAt: redisData.createdAt
          });

          const client = new BaileysClient(dir, {
            onQR: (qr) => this.handleQR(dir, qr),
            onStatus: (status) => this.handleBaileysStatusChange(dir, status),
            onMessage: (msg) => this.handleBaileysMessage(dir, msg)
          });

          await client.create();
          this.sessions.set(dir, client);
          restored++;

          logger.info(`✅ Restored Baileys session: ${dir}`);
        } catch (error) {
          logger.error(`Failed to restore session ${dir}:`, error);
        }
      }

      logger.info(`Restored ${restored} Baileys sessions`);
    } catch (error) {
      logger.error('Failed to restore sessions:', error);
    }
  }

  async cleanupInactiveSessions(inactiveThresholdMs = 3600000) {
    const now = Date.now();
    const sessionsToDelete = [];

    for (const [sessionId, metadata] of this.metadata) {
      const session = this.sessions.get(sessionId);

      // No limpiar sesiones Baileys conectadas
      if (metadata?.provider === 'baileys' && session?.getStatus() === 'connected') {
        continue;
      }

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

export const sessionManager = new SessionManager();
export default sessionManager;
