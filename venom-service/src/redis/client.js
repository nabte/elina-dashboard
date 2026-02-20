import { createClient } from 'redis';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    if (this.connected) {
      return this.client;
    }

    try {
      const clientConfig = {
        socket: {
          host: config.redis.host,
          port: config.redis.port
        }
      };

      // Solo agregar password si está definida
      if (config.redis.password) {
        clientConfig.password = config.redis.password;
      }

      this.client = createClient(clientConfig);

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.connected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }

  async get(key) {
    if (!this.connected) await this.connect();
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, options = {}) {
    if (!this.connected) await this.connect();
    const stringValue = JSON.stringify(value);

    if (options.EX) {
      return await this.client.setEx(key, options.EX, stringValue);
    }

    return await this.client.set(key, stringValue);
  }

  async del(key) {
    if (!this.connected) await this.connect();
    return await this.client.del(key);
  }

  async exists(key) {
    if (!this.connected) await this.connect();
    return await this.client.exists(key);
  }

  async keys(pattern) {
    if (!this.connected) await this.connect();
    return await this.client.keys(pattern);
  }

  async incr(key) {
    if (!this.connected) await this.connect();
    return await this.client.incr(key);
  }

  async expire(key, seconds) {
    if (!this.connected) await this.connect();
    return await this.client.expire(key, seconds);
  }
}

export const redisClient = new RedisClient();
export default redisClient;
