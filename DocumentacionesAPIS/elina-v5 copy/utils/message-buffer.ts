/**
 * ELINA V5 - Message Buffer
 * 
 * Agrupa múltiples mensajes consecutivos del mismo usuario en una sola respuesta
 * Sin Redis - usa Map en memoria (se pierde en restart pero es aceptable)
 */

interface BufferedMessage {
    text: string
    timestamp: number
}

interface MessageBuffer {
    userId: string
    contactId: number
    messages: BufferedMessage[]
    timer: number | null
    expiresAt: number
}

// In-memory storage (se pierde en restart de Edge Function)
const messageBuffers = new Map<string, MessageBuffer>()

const BUFFER_WINDOW_MS = 3000 // 3 segundos para agrupar mensajes
const BUFFER_EXPIRY_MS = 30000 // 30 segundos máximo de vida del buffer

/**
 * Agrega un mensaje al buffer y decide si procesar o esperar
 */
export async function bufferMessage(
    userId: string,
    contactId: number,
    messageText: string
): Promise<{ shouldProcess: boolean; combinedText: string }> {
    const bufferKey = `${userId}:${contactId}`
    const now = Date.now()

    // Limpiar buffers expirados
    cleanExpiredBuffers()

    // Obtener o crear buffer
    let buffer = messageBuffers.get(bufferKey)

    if (!buffer) {
        // Crear nuevo buffer
        buffer = {
            userId,
            contactId,
            messages: [],
            timer: null,
            expiresAt: now + BUFFER_EXPIRY_MS
        }
        messageBuffers.set(bufferKey, buffer)
    }

    // Agregar mensaje al buffer
    buffer.messages.push({
        text: messageText,
        timestamp: now
    })

    // Cancelar timer anterior si existe
    if (buffer.timer) {
        clearTimeout(buffer.timer)
    }

    // Crear promesa que se resuelve cuando el timer expira
    return new Promise((resolve) => {
        buffer!.timer = setTimeout(() => {
            // Timer expiró - procesar todos los mensajes
            const combinedText = buffer!.messages
                .map(m => m.text)
                .join('\n')

            // Limpiar buffer
            messageBuffers.delete(bufferKey)

            resolve({
                shouldProcess: true,
                combinedText
            })
        }, BUFFER_WINDOW_MS) as any
    })
}

/**
 * Limpia buffers expirados
 */
function cleanExpiredBuffers() {
    const now = Date.now()
    for (const [key, buffer] of messageBuffers.entries()) {
        if (buffer.expiresAt < now) {
            if (buffer.timer) {
                clearTimeout(buffer.timer)
            }
            messageBuffers.delete(key)
        }
    }
}

/**
 * Obtiene estadísticas del buffer (para debugging)
 */
export function getBufferStats() {
    return {
        activeBuffers: messageBuffers.size,
        buffers: Array.from(messageBuffers.entries()).map(([key, buffer]) => ({
            key,
            messageCount: buffer.messages.length,
            expiresIn: Math.max(0, buffer.expiresAt - Date.now())
        }))
    }
}
