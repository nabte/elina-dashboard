/**
 * ANTI-SPAM SYSTEM
 * Previene que la IA envíe muchos mensajes consecutivos sin respuesta del usuario
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SPAM_LABEL = 'paused_spam'
const MAX_CONSECUTIVE_MESSAGES = 3

/**
 * Verifica si el contacto está pausado por spam
 */
export async function isContactPausedForSpam(
    supabase: SupabaseClient,
    contactId: number
): Promise<boolean> {
    try {
        const { data } = await supabase
            .from('contacts')
            .select('labels')
            .eq('id', contactId)
            .single()

        if (!data || !data.labels) return false

        const labels = Array.isArray(data.labels) ? data.labels : []
        return labels.includes(SPAM_LABEL)

    } catch (error) {
        console.error('❌ [ANTI_SPAM] Error checking spam status:', error)
        return false
    }
}

/**
 * Quita el label de spam del contacto (cuando el usuario responde)
 */
export async function unpauseContact(
    supabase: SupabaseClient,
    contactId: number
): Promise<void> {
    try {
        const { data } = await supabase
            .from('contacts')
            .select('labels')
            .eq('id', contactId)
            .single()

        if (!data) return

        const labels = Array.isArray(data.labels) ? data.labels : []
        const newLabels = labels.filter(l => l !== SPAM_LABEL)

        // Solo actualizar si había el label
        if (labels.length !== newLabels.length) {
            await supabase
                .from('contacts')
                .update({ labels: newLabels })
                .eq('id', contactId)

            console.log(`✅ [ANTI_SPAM] Contact ${contactId} reactivated`)
        }

    } catch (error) {
        console.error('❌ [ANTI_SPAM] Error unpausing contact:', error)
    }
}

/**
 * Verifica si se debe pausar al contacto por spam
 * Cuenta mensajes consecutivos del asistente sin respuesta del usuario
 */
export async function checkAndPauseIfSpam(
    supabase: SupabaseClient,
    userId: string,
    contactId: number
): Promise<boolean> {
    try {
        // Obtener últimos mensajes del contacto
        const { data: messages } = await supabase
            .from('chat_history')
            .select('message_type')
            .eq('user_id', userId)
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .limit(10)

        if (!messages || messages.length === 0) return false

        // Contar mensajes consecutivos del asistente
        let consecutiveAssistantMessages = 0

        for (const msg of messages) {
            if (msg.message_type === 'assistant') {
                consecutiveAssistantMessages++
            } else {
                // Si encontramos un mensaje del usuario, detener el conteo
                break
            }
        }

        console.log(`📊 [ANTI_SPAM] Contact ${contactId}: ${consecutiveAssistantMessages} consecutive assistant messages`)

        // Si hay 3 o más mensajes consecutivos del asistente, pausar
        if (consecutiveAssistantMessages >= MAX_CONSECUTIVE_MESSAGES) {
            await pauseContact(supabase, contactId)
            return true
        }

        return false

    } catch (error) {
        console.error('❌ [ANTI_SPAM] Error checking spam:', error)
        return false
    }
}

/**
 * Pausa un contacto por spam (agrega el label)
 */
async function pauseContact(
    supabase: SupabaseClient,
    contactId: number
): Promise<void> {
    try {
        const { data } = await supabase
            .from('contacts')
            .select('labels')
            .eq('id', contactId)
            .single()

        if (!data) return

        const labels = Array.isArray(data.labels) ? data.labels : []

        // Solo agregar si no existe
        if (!labels.includes(SPAM_LABEL)) {
            labels.push(SPAM_LABEL)

            await supabase
                .from('contacts')
                .update({ labels })
                .eq('id', contactId)

            console.log(`⏸️ [ANTI_SPAM] Contact ${contactId} paused due to spam detection`)
        }

    } catch (error) {
        console.error('❌ [ANTI_SPAM] Error pausing contact:', error)
    }
}
