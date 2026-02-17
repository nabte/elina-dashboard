// utils/phone-utils.js - Utilidades centralizadas para manejo de teléfonos

/**
 * Limpia y normaliza un número de teléfono
 * @param {string} value - Número de teléfono a limpiar
 * @returns {string} Número limpio (solo dígitos)
 */
export function cleanPhone(value) {
    if (!value) return '';
    // Remover todo excepto dígitos y el símbolo +
    return String(value).replace(/[^\d+]/g, '');
}

/**
 * Valida un número de teléfono
 * @param {string} phone - Número a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export function validatePhone(phone, options = {}) {
    const {
        minLength = 10,
        maxLength = 15,
        allowInternational = true
    } = options;

    const cleaned = cleanPhone(phone);
    const errors = [];

    if (!cleaned) {
        errors.push('El número de teléfono es requerido');
        return { valid: false, errors, cleaned };
    }

    // Verificar si es internacional
    const isInternational = cleaned.startsWith('+');

    if (isInternational && !allowInternational) {
        errors.push('No se permiten números internacionales');
    }

    // Obtener solo los dígitos
    const digits = cleaned.replace(/\+/g, '');

    if (digits.length < minLength) {
        errors.push(`El número debe tener al menos ${minLength} dígitos`);
    }

    if (digits.length > maxLength) {
        errors.push(`El número no debe superar ${maxLength} dígitos`);
    }

    return {
        valid: errors.length === 0,
        errors,
        cleaned,
        isInternational,
        digits
    };
}

/**
 * Formatea un número de teléfono para mostrar
 * @param {string} phone - Número a formatear
 * @param {string} format - Formato deseado ('international', 'national', 'raw')
 * @returns {string} Número formateado
 */
export function formatPhone(phone, format = 'raw') {
    const cleaned = cleanPhone(phone);

    if (!cleaned) return '';

    if (format === 'raw') {
        return cleaned;
    }

    // Si es internacional y ya tiene +, mantenerlo
    if (format === 'international' && !cleaned.startsWith('+')) {
        return `+${cleaned}`;
    }

    // Formato nacional (México): (XXX) XXX-XXXX
    if (format === 'national' && cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    return cleaned;
}

/**
 * Normaliza un número de teléfono a formato E.164
 * @param {string} phone - Número a normalizar
 * @param {string} defaultCountryCode - Código de país por defecto (ej: '52' para México)
 * @returns {string} Número en formato E.164
 */
export function normalizeToE164(phone, defaultCountryCode = '52') {
    const cleaned = cleanPhone(phone);

    if (!cleaned) return '';

    // Si ya tiene +, retornar tal cual
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // Si tiene 10 dígitos, agregar código de país
    if (cleaned.length === 10) {
        return `+${defaultCountryCode}${cleaned}`;
    }

    // Si tiene más de 10 dígitos, asumir que ya incluye código de país
    if (cleaned.length > 10) {
        return `+${cleaned}`;
    }

    return cleaned;
}

/**
 * Extrae el código de país de un número internacional
 * @param {string} phone - Número internacional
 * @returns {string|null} Código de país o null
 */
export function extractCountryCode(phone) {
    const cleaned = cleanPhone(phone);

    if (!cleaned.startsWith('+')) {
        return null;
    }

    // Códigos de país comunes (1-3 dígitos)
    const match = cleaned.match(/^\+(\d{1,3})/);
    return match ? match[1] : null;
}

/**
 * Verifica si un número es válido para WhatsApp
 * @param {string} phone - Número a verificar
 * @returns {Object} Resultado de verificación
 */
export function isValidWhatsAppNumber(phone) {
    const validation = validatePhone(phone, {
        minLength: 10,
        maxLength: 15,
        allowInternational: true
    });

    if (!validation.valid) {
        return validation;
    }

    // WhatsApp requiere formato E.164
    const e164 = normalizeToE164(phone);

    return {
        valid: true,
        formatted: e164,
        cleaned: validation.cleaned
    };
}
