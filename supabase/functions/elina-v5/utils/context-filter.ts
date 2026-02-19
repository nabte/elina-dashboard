/**
 * ELINA V5 - Context Filter
 *
 * Filtra SOLO cotizaciones formales antiguas (subtotales/totales estructurados).
 * NO borra mensajes que simplemente mencionan precios — eso es contexto valioso.
 */

import type { Message } from '../config/types.ts'

/**
 * Detecta si el mensaje actual es una solicitud de cotización formal nueva
 * que debería invalidar cotizaciones anteriores (no todo el contexto).
 */
export function isNewTransactionalRequest(message: string, history: Message[]): boolean {
    const text = message.toLowerCase()

    // Solo activar filtro para solicitudes EXPLÍCITAS de cotización/presupuesto
    const quoteKeywords = [
        'cotización', 'cotizacion', 'presupuesto',
        'cuánto sería todo', 'cuanto seria todo',
        'precio total', 'total de todo'
    ]

    const hasQuoteKeyword = quoteKeywords.some(kw => text.includes(kw))

    // Si no hay historial, no hay nada que filtrar
    if (history.length === 0) return false

    // Solo filtrar si es una solicitud explícita de cotización nueva
    return hasQuoteKeyword
}

/**
 * Filtra SOLO cotizaciones formales antiguas (con formato subtotal/total estructurado).
 * Mensajes conversacionales que mencionan precios se MANTIENEN.
 */
export function filterTransactionalContext(history: Message[], isNewRequest: boolean): Message[] {
    if (!isNewRequest) return history

    return history.filter(msg => {
        const text = msg.content.toLowerCase()

        // Solo filtrar mensajes que son cotizaciones formales (tienen subtotal Y total)
        const isFormalQuote = text.includes('subtotal:') && text.includes('total:')
        const isFormalAppointmentConfirmation = text.includes('cita confirmada') && text.includes('id de cita')

        // Mantener todo excepto cotizaciones formales antiguas
        return !isFormalQuote && !isFormalAppointmentConfirmation
    })
}
