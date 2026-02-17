/**
 * ELINA V5 - Context Filter
 * 
 * Filtra mensajes antiguos para evitar alucinaciones con precios/citas viejas
 */

import type { Message } from '../config/types.ts'

/**
 * Detecta si el mensaje actual es una nueva solicitud transaccional
 * (precio, cita, info) que debería invalidar el contexto anterior.
 */
export function isNewTransactionalRequest(message: string, history: Message[]): boolean {
    const text = message.toLowerCase()

    // Palabras clave de intención transaccional
    const transactionalKeywords = [
        'precio', 'costo', 'cuesta', 'cuanto', 'cuánto',
        'cita', 'agenda', 'reservar', 'disponible', 'horario',
        'info', 'información', 'detalles'
    ]

    const hasKeyword = transactionalKeywords.some(kw => text.includes(kw))

    // Si no hay historial reciente, es una nueva solicitud
    if (history.length === 0) return true

    // Si pasaron más de 2 horas desde el último mensaje, es nueva sesión
    const lastMsgTime = new Date(history[0].timestamp).getTime()
    const now = Date.now()
    const isSessionExpired = (now - lastMsgTime) > (2 * 60 * 60 * 1000)

    return hasKeyword || isSessionExpired
}

/**
 * Filtra el contexto histórico para eliminar "ruido" transaccional viejo
 */
export function filterTransactionalContext(history: Message[], isNewRequest: boolean): Message[] {
    if (!isNewRequest) return history

    // Si es una nueva solicitud, filtramos mensajes viejos que contienen precios o citas
    // para que el bot no se confunda con datos antiguos.
    return history.filter(msg => {
        const text = msg.content.toLowerCase()
        const isOldQuote = text.includes('subtotal:') || text.includes('total:') || text.includes('$')
        const isOldAppointment = text.includes('cita confirmada') || text.includes('reserva')

        // Mantenemos solo mensajes conversacionales, no transaccionales viejos
        return !isOldQuote && !isOldAppointment
    })
}
