/**
 * ELINA V5 - Filters System
 * 
 * Sistema de filtros para ignorar mensajes según etiquetas, estado de conversación, etc.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountConfig, FilterResult, Contact, ConversationState } from '../config/types.ts'

/**
 * Determina si un mensaje debe ser ignorado
 */
export async function shouldIgnoreMessage(
    supabase: SupabaseClient,
    config: AccountConfig,
    contactId: number
): Promise<FilterResult> {
    console.log(`🔍 [FILTER] Checking if message should be ignored for contact ${contactId}`)

    // 1. Obtener información del contacto
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('labels, is_simulation')
        .eq('id', contactId)
        .single()

    if (contactError || !contact) {
        console.warn(`⚠️ [FILTER] Contact not found: ${contactId}`)
        return { ignore: false }
    }

    // 2. Verificar etiquetas ignoradas
    const contactLabels = (contact as Contact).labels || []

    // El usuario confirmó explícitamente: "si entro de sus label existe 'ignorar' ingoramos"
    const hasIgnoredLabel = contactLabels.some(label =>
        label.toLowerCase() === 'ignorar' ||
        config.ignoredLabels.includes(label)
    )

    if (hasIgnoredLabel) {
        console.log(`🚫 [FILTER] Contact has ignored label. Labels: ${contactLabels.join(', ')}`)
        return {
            ignore: true,
            reason: `Contact marked as 'ignorar'`
        }
    }

    // 3. Verificar si la conversación está pausada
    const { data: convState, error: convError } = await supabase
        .from('conversation_states')
        .select('is_paused, pause_reason')
        .eq('contact_id', contactId)
        .maybeSingle()

    if (!convError && convState) {
        const state = convState as ConversationState
        if (state.is_paused) {
            console.log(`⏸️ [FILTER] Conversation is paused: ${state.pause_reason}`)
            return {
                ignore: true,
                reason: `Conversation paused: ${state.pause_reason || 'No reason provided'}`
            }
        }
    }

    // 4. Verificar horario laboral (solo si no es simulación)
    if (!contact.is_simulation) {
        const now = new Date()
        const currentHour = now.getHours()

        if (currentHour < config.workStartHour || currentHour >= config.workEndHour) {
            console.log(`🕐 [FILTER] Outside working hours (${currentHour}:00, work hours: ${config.workStartHour}-${config.workEndHour})`)
            // NO ignorar, pero podríamos enviar un mensaje automático
            // Por ahora, permitimos que el bot responda 24/7
        }
    }

    console.log(`✅ [FILTER] Message should be processed`)
    return { ignore: false }
}

/**
 * Verifica si un contacto tiene una etiqueta específica
 */
export async function contactHasLabel(
    supabase: SupabaseClient,
    contactId: number,
    labelName: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from('contacts')
        .select('labels')
        .eq('id', contactId)
        .single()

    if (error || !data) {
        return false
    }

    const labels = (data as Contact).labels || []
    return labels.includes(labelName)
}

/**
 * Pausa una conversación
 */
export async function pauseConversation(
    supabase: SupabaseClient,
    contactId: number,
    userId: string,
    reason: string
): Promise<void> {
    console.log(`⏸️ [FILTER] Pausing conversation for contact ${contactId}`)

    const { error } = await supabase
        .from('conversation_states')
        .upsert({
            contact_id: contactId,
            user_id: userId,
            is_paused: true,
            pause_reason: reason,
            paused_at: new Date().toISOString(),
            paused_by: userId,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'contact_id'
        })

    if (error) {
        console.error(`❌ [FILTER] Error pausing conversation: ${error.message}`)
        throw error
    }

    console.log(`✅ [FILTER] Conversation paused successfully`)
}

/**
 * Reanuda una conversación
 */
export async function resumeConversation(
    supabase: SupabaseClient,
    contactId: number,
    userId: string
): Promise<void> {
    console.log(`▶️ [FILTER] Resuming conversation for contact ${contactId}`)

    const { error } = await supabase
        .from('conversation_states')
        .update({
            is_paused: false,
            pause_reason: null,
            resumed_at: new Date().toISOString(),
            resumed_by: userId,
            updated_at: new Date().toISOString()
        })
        .eq('contact_id', contactId)

    if (error) {
        console.error(`❌ [FILTER] Error resuming conversation: ${error.message}`)
        throw error
    }

    console.log(`✅ [FILTER] Conversation resumed successfully`)
}

/**
 * Verifica si un mensaje es spam o abusivo
 */
export function isSpamOrAbusive(message: string): boolean {
    // Detectar mensajes muy cortos repetidos
    if (message.length < 3) {
        return true
    }

    // Detectar caracteres repetidos excesivamente
    const repeatedCharsRegex = /(.)\1{10,}/
    if (repeatedCharsRegex.test(message)) {
        return true
    }

    // Detectar URLs sospechosas (opcional)
    const suspiciousUrlRegex = /(bit\.ly|tinyurl|goo\.gl)/i
    if (suspiciousUrlRegex.test(message)) {
        console.warn(`⚠️ [FILTER] Suspicious URL detected in message`)
        // No bloquear automáticamente, solo advertir
    }

    return false
}
