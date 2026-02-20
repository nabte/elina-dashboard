import logger from '../utils/logger.js';

/**
 * Transforma eventos de Venom al formato Baileys (compatible con Evolution API)
 * Esto asegura compatibilidad total con las edge functions existentes sin modificarlas
 */
export class EventTransformer {
  /**
   * Transforma un mensaje de Venom al formato MESSAGES_UPSERT de Baileys
   */
  static messageToBaileys(message, sessionId) {
    try {
      const isGroup = message.isGroupMsg || message.chatId.includes('@g.us');

      return {
        event: 'MESSAGES_UPSERT',
        instance: sessionId,
        data: {
          key: {
            remoteJid: message.from || message.chatId,
            id: message.id,
            fromMe: message.fromMe || false,
            participant: isGroup ? message.sender?.id : undefined
          },
          message: this.transformMessageContent(message),
          pushName: message.sender?.pushname || message.notifyName || message.sender?.name,
          messageTimestamp: message.timestamp || Math.floor(Date.now() / 1000),
          broadcast: message.broadcast || false,
          ...(isGroup && { participant: message.sender?.id })
        }
      };
    } catch (error) {
      logger.error('Error transforming message to Baileys:', error);
      throw error;
    }
  }

  /**
   * Transforma el contenido del mensaje según su tipo
   */
  static transformMessageContent(message) {
    const content = {};

    // Texto simple
    if (message.body && message.type === 'chat') {
      content.conversation = message.body;
    }

    // Imagen
    else if (message.type === 'image') {
      content.imageMessage = {
        caption: message.caption || '',
        mimetype: message.mimetype || 'image/jpeg',
        url: message.deprecatedMms3Url || '',
        mediaKey: message.mediaKey || '',
        ...(message.isViewOnce && { viewOnce: true })
      };
    }

    // Video
    else if (message.type === 'video') {
      content.videoMessage = {
        caption: message.caption || '',
        mimetype: message.mimetype || 'video/mp4',
        url: message.deprecatedMms3Url || '',
        seconds: message.duration || 0
      };
    }

    // Audio
    else if (message.type === 'audio' || message.type === 'ptt') {
      content.audioMessage = {
        mimetype: message.mimetype || 'audio/ogg; codecs=opus',
        url: message.deprecatedMms3Url || '',
        seconds: message.duration || 0,
        ptt: message.type === 'ptt'
      };
    }

    // Documento
    else if (message.type === 'document') {
      content.documentMessage = {
        title: message.filename || 'document',
        fileName: message.filename || 'document',
        mimetype: message.mimetype || 'application/octet-stream',
        url: message.deprecatedMms3Url || ''
      };
    }

    // Sticker
    else if (message.type === 'sticker') {
      content.stickerMessage = {
        mimetype: 'image/webp',
        url: message.deprecatedMms3Url || ''
      };
    }

    // Contacto
    else if (message.type === 'vcard') {
      content.contactMessage = {
        displayName: message.subtype || '',
        vcard: message.body || ''
      };
    }

    // Ubicación
    else if (message.type === 'location') {
      content.locationMessage = {
        degreesLatitude: message.lat || 0,
        degreesLongitude: message.lng || 0,
        address: message.loc || ''
      };
    }

    // Texto con otros tipos
    else if (message.body) {
      content.conversation = message.body;
    }

    return content;
  }

  /**
   * Transforma evento de estado de conexión
   */
  static connectionToBaileys(state, sessionId, qr = null) {
    const baileyState = {
      event: 'CONNECTION_UPDATE',
      instance: sessionId,
      data: {
        state: this.mapConnectionState(state)
      }
    };

    if (qr) {
      baileyState.data.qr = qr;
    }

    return baileyState;
  }

  /**
   * Mapea estados de conexión Venom a Baileys
   */
  static mapConnectionState(venomState) {
    const stateMap = {
      'CONNECTED': 'open',
      'OPENING': 'connecting',
      'PAIRING': 'connecting',
      'TIMEOUT': 'close',
      'CONFLICT': 'close',
      'UNLAUNCHED': 'close',
      'QRREADFAIL': 'close',
      'QRREADCODE': 'qr_ready',
      'DEPRECATED_VERSION': 'close'
    };

    return stateMap[venomState] || 'close';
  }

  /**
   * Transforma evento de QR code
   */
  static qrToBaileys(qr, sessionId) {
    return {
      event: 'QR_CODE',
      instance: sessionId,
      data: {
        qr: qr
      }
    };
  }

  /**
   * Transforma evento genérico
   */
  static genericEvent(eventType, data, sessionId) {
    return {
      event: eventType,
      instance: sessionId,
      data: data
    };
  }
}

export default EventTransformer;
