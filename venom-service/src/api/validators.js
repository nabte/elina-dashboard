import Joi from 'joi';
import { ValidationError } from '../utils/errors.js';

/**
 * Esquemas de validación para endpoints de la API
 */

export const schemas = {
  createSession: Joi.object({
    sessionId: Joi.string().alphanum().min(3).max(50).required(),
    userId: Joi.string().uuid().required(),
    provider: Joi.string().valid('baileys', 'venom').default('baileys'),
    webhookUrl: Joi.string().uri().optional(),
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    metadata: Joi.object().optional()
  }),

  pairingCode: Joi.object({
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
  }),

  sendMessage: Joi.object({
    sessionId: Joi.string().required(),
    to: Joi.string().required(),
    message: Joi.alternatives().try(
      Joi.string().max(4096),
      Joi.object({
        path: Joi.string().required(),
        filename: Joi.string(),
        caption: Joi.string()
      })
    ).required(),
    type: Joi.string().valid('text', 'image', 'file', 'video', 'audio').default('text')
  }),

  updateWebhook: Joi.object({
    webhookUrl: Joi.string().uri().required()
  }),

  sessionId: Joi.object({
    sessionId: Joi.string().required()
  })
};

/**
 * Middleware para validar request body
 */
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(message));
    }

    // Reemplazar req.body con valores validados y sanitizados
    req.body = value;
    next();
  };
}

/**
 * Valida parámetros de URL
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false
    });

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(message));
    }

    req.params = value;
    next();
  };
}

/**
 * Sanitiza número de teléfono para WhatsApp
 * Baileys requiere formato: 5219995169313 (SIN el símbolo +)
 */
export function sanitizePhoneNumber(phone) {
  if (!phone) return null;

  // Remover TODO excepto números (incluyendo el +)
  let sanitized = phone.replace(/\D/g, '');

  return sanitized;
}
