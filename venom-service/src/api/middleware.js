import cors from 'cors';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import redisClient from '../redis/client.js';
import { InvalidCredentialsError, VenomServiceError } from '../utils/errors.js';

/**
 * Middleware de autenticación via API Key
 */
export function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== config.security.apiKey) {
    logger.warn('Unauthorized API request', {
      ip: req.ip,
      path: req.path
    });

    return next(new InvalidCredentialsError());
  }

  next();
}

/**
 * Middleware de CORS
 */
export const corsMiddleware = cors({
  origin: '*', // En producción, restringir a dominio de Supabase
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
});

/**
 * Rate limiting por IP (usa Redis)
 */
export function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `ratelimit:${ip}`;

  redisClient.get(key)
    .then(requests => {
      const count = parseInt(requests || '0', 10);

      if (count >= config.rateLimit.maxRequests) {
        logger.warn('Rate limit exceeded', { ip, count });

        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
        });
      }

      // Incrementar contador
      return redisClient.incr(key)
        .then(() => {
          if (count === 0) {
            // Primer request, setear expiración
            return redisClient.expire(key, Math.ceil(config.rateLimit.windowMs / 1000));
          }
        })
        .then(() => next());
    })
    .catch(err => {
      logger.error('Rate limiter error:', err);
      // En caso de error de Redis, permitir el request
      next();
    });
}

/**
 * Logger de requests
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  });

  next();
}

/**
 * Manejador global de errores
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Errores personalizados
  if (err instanceof VenomServiceError) {
    logger.error('Service error:', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path
    });

    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
  }

  // Errores genéricos
  logger.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal server error',
    message: config.server.env === 'development' ? err.message : undefined
  });
}

/**
 * Handler para rutas no encontradas
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
}
