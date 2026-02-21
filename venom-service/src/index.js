import express from 'express';
import { config } from './config/env.js';
import logger from './utils/logger.js';
import sessionManager from './venom/session-manager.js';
import redisClient from './redis/client.js';
import router from './api/routes.js';
import {
  corsMiddleware,
  authenticate,
  rateLimiter,
  requestLogger,
  errorHandler,
  notFoundHandler
} from './api/middleware.js';

const app = express();

/**
 * Middlewares globales
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(corsMiddleware);
app.use(requestLogger);

/**
 * Rate limiting (solo en producción)
 */
if (config.server.env === 'production') {
  app.use(rateLimiter);
}

/**
 * Autenticación (excepto /health)
 */
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/') {
    return next();
  }
  authenticate(req, res, next);
});

/**
 * Rutas
 */
app.use('/', router);

/**
 * Handlers de error
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Inicialización del servidor
 */
async function startServer() {
  try {
    logger.info('Starting WhatsApp Multi-Tenant Service (Baileys + Venom)...');

    // Inicializar Redis
    await redisClient.connect();
    logger.info('✓ Redis connected');

    // Inicializar SessionManager
    await sessionManager.initialize();
    logger.info('✓ SessionManager initialized');

    // Iniciar servidor HTTP
    const server = app.listen(config.server.port, () => {
      logger.info(`✓ Server running on port ${config.server.port}`);
      logger.info(`Environment: ${config.server.env}`);
      logger.info(`Max sessions: ${config.venom.maxSessions}`);
    });

    // Cleanup graceful
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        try {
          const sessions = await sessionManager.listSessions();
          for (const session of sessions) {
            if (session.provider === 'baileys') {
              // Baileys: solo desconectar, mantener auth state
              await sessionManager.disconnectSession(session.sessionId);
            } else {
              await sessionManager.deleteSession(session.sessionId);
            }
          }

          await redisClient.disconnect();

          logger.info('Shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Forzar cierre después de 30 segundos
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Cleanup de sesiones inactivas cada hora
    setInterval(async () => {
      try {
        const cleaned = await sessionManager.cleanupInactiveSessions();
        if (cleaned > 0) {
          logger.info(`Cleaned up ${cleaned} inactive sessions`);
        }
      } catch (error) {
        logger.error('Error cleaning up sessions:', error);
      }
    }, 3600000); // 1 hora

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Iniciar servidor
startServer();
