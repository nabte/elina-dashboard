import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'production'
  },

  security: {
    apiKey: process.env.API_KEY || 'change-me-in-production'
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  },

  venom: {
    headless: process.env.VENOM_HEADLESS !== 'false',
    useChrome: process.env.VENOM_USE_CHROME !== 'false',
    logQR: process.env.VENOM_LOG_QR === 'true',
    sessionsDir: process.env.SESSIONS_DIR || '/sessions',
    maxSessions: parseInt(process.env.MAX_SESSIONS || '15', 10)
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  webhook: {
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.WEBHOOK_RETRY_DELAY_MS || '1000', 10),
    timeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000', 10)
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
