import express from 'express';
import sessionManager from '../venom/session-manager.js';
import { validate, schemas, sanitizePhoneNumber } from './validators.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /sessions
 * Crea una nueva sesión de WhatsApp
 */
router.post('/sessions', validate(schemas.createSession), async (req, res, next) => {
  try {
    const { sessionId, userId, webhookUrl, phoneNumber, metadata } = req.body;

    const result = await sessionManager.createSession(sessionId, userId, {
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
 * Obtiene el QR code de una sesión
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
 * GET /sessions/:sessionId/status
 * Obtiene el estado de una sesión
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
 * DELETE /sessions/:sessionId
 * Elimina una sesión
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
 * Lista todas las sesiones activas
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
 * Envía un mensaje desde una sesión
 */
router.post('/messages', validate(schemas.sendMessage), async (req, res, next) => {
  try {
    const { sessionId, to, message, type } = req.body;

    const sanitizedTo = sanitizePhoneNumber(to) + '@s.whatsapp.net';

    const result = await sessionManager.sendMessage(sessionId, sanitizedTo, message, type);

    res.json({
      success: true,
      messageId: result.id,
      timestamp: result.t
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /health
 * Healthcheck endpoint
 */
router.get('/health', async (req, res) => {
  const sessions = await sessionManager.listSessions();

  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeSessions: sessions.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /
 * Info endpoint
 */
router.get('/', (req, res) => {
  res.json({
    service: 'Venom WhatsApp Multi-Tenant Service',
    version: '1.0.0',
    endpoints: {
      sessions: {
        create: 'POST /sessions',
        list: 'GET /sessions',
        getQR: 'GET /sessions/:sessionId/qr',
        getStatus: 'GET /sessions/:sessionId/status',
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
