import express from 'express';
import sessionManager from '../venom/session-manager.js';
import { validate, schemas, sanitizePhoneNumber } from './validators.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /sessions
 * Crea una nueva sesión (provider: 'baileys' | 'venom', default: 'baileys')
 */
router.post('/sessions', validate(schemas.createSession), async (req, res, next) => {
  try {
    const { sessionId, userId, provider, webhookUrl, phoneNumber, metadata } = req.body;

    const result = await sessionManager.createSession(sessionId, userId, {
      provider,
      webhookUrl,
      phoneNumber: sanitizePhoneNumber(phoneNumber),
      metadata
    });

    res.status(201).json(result);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /sessions/:sessionId/qr
 */
router.get('/sessions/:sessionId/qr', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const qrData = await sessionManager.getQR(sessionId);
    res.json(qrData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /sessions/:sessionId/pairing-code
 * Solicita código de emparejamiento (solo Baileys)
 */
router.post('/sessions/:sessionId/pairing-code', validate(schemas.pairingCode), async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { phoneNumber } = req.body;

    const result = await sessionManager.getPairingCode(sessionId, phoneNumber);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /sessions/:sessionId/status
 */
router.get('/sessions/:sessionId/status', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const status = await sessionManager.getStatus(sessionId);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /sessions/:sessionId/webhook
 */
router.put('/sessions/:sessionId/webhook', validate(schemas.updateWebhook), async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { webhookUrl } = req.body;
    const result = await sessionManager.updateWebhook(sessionId, webhookUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /sessions/:sessionId
 */
router.delete('/sessions/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await sessionManager.deleteSession(sessionId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /sessions
 */
router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await sessionManager.listSessions();
    res.json({
      count: sessions.length,
      sessions
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /messages
 */
router.post('/messages', validate(schemas.sendMessage), async (req, res, next) => {
  try {
    const { sessionId, to, message, type } = req.body;

    const sanitizedTo = sanitizePhoneNumber(to) + '@s.whatsapp.net';
    const result = await sessionManager.sendMessage(sessionId, sanitizedTo, message, type);

    res.json({
      success: true,
      messageId: result?.key?.id || result?.id,
      timestamp: result?.messageTimestamp || result?.t
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /health
 */
router.get('/health', async (req, res) => {
  const sessions = await sessionManager.listSessions();

  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeSessions: sessions.length,
    providers: {
      baileys: sessions.filter(s => s.provider === 'baileys').length,
      venom: sessions.filter(s => s.provider === 'venom').length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /
 */
router.get('/', (req, res) => {
  res.json({
    service: 'WhatsApp Multi-Tenant Service (Baileys + Venom)',
    version: '2.0.0',
    defaultProvider: 'baileys',
    endpoints: {
      sessions: {
        create: 'POST /sessions { provider: "baileys"|"venom" }',
        list: 'GET /sessions',
        getQR: 'GET /sessions/:sessionId/qr',
        pairingCode: 'POST /sessions/:sessionId/pairing-code (Baileys only)',
        getStatus: 'GET /sessions/:sessionId/status',
        updateWebhook: 'PUT /sessions/:sessionId/webhook',
        delete: 'DELETE /sessions/:sessionId'
      },
      messages: {
        send: 'POST /messages'
      },
      health: 'GET /health'
    }
  });
});

export default router;
