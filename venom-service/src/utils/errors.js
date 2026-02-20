export class VenomServiceError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class SessionNotFoundError extends VenomServiceError {
  constructor(sessionId) {
    super(`Session not found: ${sessionId}`, 404, 'SESSION_NOT_FOUND');
    this.sessionId = sessionId;
  }
}

export class SessionAlreadyExistsError extends VenomServiceError {
  constructor(sessionId) {
    super(`Session already exists: ${sessionId}`, 409, 'SESSION_EXISTS');
    this.sessionId = sessionId;
  }
}

export class MaxSessionsReachedError extends VenomServiceError {
  constructor(maxSessions) {
    super(`Maximum sessions limit reached: ${maxSessions}`, 429, 'MAX_SESSIONS_REACHED');
    this.maxSessions = maxSessions;
  }
}

export class InvalidCredentialsError extends VenomServiceError {
  constructor() {
    super('Invalid API key', 401, 'INVALID_CREDENTIALS');
  }
}

export class ValidationError extends VenomServiceError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class WebhookError extends VenomServiceError {
  constructor(message, url) {
    super(`Webhook error: ${message}`, 500, 'WEBHOOK_ERROR');
    this.webhookUrl = url;
  }
}
