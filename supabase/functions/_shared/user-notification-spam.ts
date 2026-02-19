/**
 * USER NOTIFICATION ANTI-SPAM SYSTEM
 * Previene enviar demasiados mensajes al contact_phone del USUARIO sin que responda por WhatsApp
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_NOTIFICATIONS_WITHOUT_RESPONSE = 3

/**
 * Verifica si podemos enviar una notificación al usuario
 * Revisa el contador de mensajes enviados sin respuesta
 */
export async function canSendUserNotification(
    supabase: SupabaseClient,
    userId: string
): Promise<{ canSend: boolean; reason?: string; currentCount?: number }> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('notification_messages_sent')
            .eq('id', userId)
            .single()

        if (!profile) {
            return { canSend: false, reason: 'User profile not found' }
        }

        const messagesSent = profile.notification_messages_sent || 0

        console.log(`📊 [ANTI_SPAM] User ${userId}: ${messagesSent} notifications sent without response`)

        if (messagesSent >= MAX_NOTIFICATIONS_WITHOUT_RESPONSE) {
            return {
                canSend: false,
                reason: `User has ${messagesSent} unresponded notifications (max: ${MAX_NOTIFICATIONS_WITHOUT_RESPONSE})`,
                currentCount: messagesSent
            }
        }

        return {
            canSend: true,
            currentCount: messagesSent
        }

    } catch (error) {
        console.error('❌ [ANTI_SPAM] Error checking notification spam:', error)
        // En caso de error, permitir el envío (fail-safe)
        return { canSend: true }
    }
}

/**
 * Incrementa el contador de notificaciones enviadas
 * Se llama DESPUÉS de enviar exitosamente un mensaje
 */
export async function incrementNotificationCounter(
    supabase: SupabaseClient,
    userId: string
): Promise<void> {
    try {
        const { error } = await supabase.rpc('increment_notification_counter', {
            user_id: userId
        })

        if (error) {
            console.error('❌ [ANTI_SPAM] Error incrementing counter:', error)
        } else {
            console.log(`✅ [ANTI_SPAM] Notification counter incremented for user ${userId}`)
        }
    } catch (error) {
        console.error('❌ [ANTI_SPAM] Error in incrementNotificationCounter:', error)
    }
}

/**
 * Resetea el contador cuando el usuario responde por WhatsApp
 * Se llama desde el webhook de ElinaHead
 */
export async function resetNotificationCounter(
    supabase: SupabaseClient,
    contactPhone: string
): Promise<void> {
    try {
        // Buscar usuario por contact_phone
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, notification_messages_sent')
            .eq('contact_phone', contactPhone)
            .single()

        if (!profile) {
            console.log(`⚠️ [ANTI_SPAM] No user found with contact_phone: ${contactPhone}`)
            return
        }

        if (profile.notification_messages_sent === 0) {
            console.log(`ℹ️ [ANTI_SPAM] User ${profile.full_name} already has counter at 0`)
            return
        }

        // Resetear contador
        const { error } = await supabase
            .from('profiles')
            .update({
                notification_messages_sent: 0,
                notification_last_acknowledged_at: new Date().toISOString()
            })
            .eq('id', profile.id)

        if (error) {
            console.error('❌ [ANTI_SPAM] Error resetting counter:', error)
        } else {
            console.log(`✅ [ANTI_SPAM] Counter reset for user ${profile.full_name} (${contactPhone})`)
        }

    } catch (error) {
        console.error('❌ [ANTI_SPAM] Error in resetNotificationCounter:', error)
    }
}
