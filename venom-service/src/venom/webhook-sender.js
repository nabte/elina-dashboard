import axios from 'axios';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import { WebhookError } from '../utils/errors.js';

/**
 * Maneja el envío de webhooks con reintentos y backoff exponencial
 */
export class WebhookSender {
  constructor() {
    this.retryAttempts = config.webhook.retryAttempts;
    this.retryDelay = config.webhook.retryDelayMs;
    this.timeout = config.webhook.timeoutMs;
  }

  /**
   * Envía un webhook con reintentos
   */
  async send(url, payload, attempt = 1) {
    if (!url) {
      logger.warn('Webhook URL not configured, skipping send');
      return { success: false, reason: 'No webhook URL' };
    }

    try {
      logger.info(`Sending webhook to ${url} (attempt ${attempt}/${this.retryAttempts})`);

      const response = await axios.post(url, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Venom-WhatsApp-Service/1.0'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info(`Webhook sent successfully to ${url}`, {
          status: response.status,
          event: payload.event,
          instance: payload.instance
        });

        return {
          success: true,
          status: response.status,
          data: response.data
        };
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

    } catch (error) {
      logger.error(`Webhook send failed (attempt ${attempt}/${this.retryAttempts}):`, {
        url,
        error: error.message,
        event: payload.event
      });

      if (attempt < this.retryAttempts) {
        const delay = this.calculateBackoff(attempt);
        logger.info(`Retrying webhook in ${delay}ms...`);

        await this.sleep(delay);
        return this.send(url, payload, attempt + 1);
      } else {
        logger.error(`Webhook failed after ${this.retryAttempts} attempts`, {
          url,
          event: payload.event
        });

        return {
          success: false,
          error: error.message,
          attempts: attempt
        };
      }
    }
  }

  /**
   * Calcula el delay con backoff exponencial
   */
  calculateBackoff(attempt) {
    return this.retryDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Helper para sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Envía múltiples webhooks en paralelo (para broadcast)
   */
  async sendBatch(webhooks) {
    const promises = webhooks.map(({ url, payload }) =>
      this.send(url, payload).catch(err => ({
        success: false,
        error: err.message,
        url
      }))
    );

    return await Promise.allSettled(promises);
  }
}

export default new WebhookSender();
