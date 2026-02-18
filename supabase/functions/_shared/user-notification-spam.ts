/**
 * USER NOTIFICATION ANTI-SPAM SYSTEM
 * Previene enviar demasiados mensajes al contact_phone del USUARIO sin que este responda
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_NOTIFICATIONS_WITHOUT_RESPONSE = 3

/**
 * Verifica si podemos enviar una notificación al usuario
 * Cuenta mensajes en los últimos 3 días y verifica actividad del usuario
 */
export async function canSendUserNotification(
    supabase: SupabaseClient,
    userId: string
): Promise<{ canSend: boolean; reason?: string }> {
    try {
        // Obtener última actividad del usuario (login)
        const { data: authData } = await supabase.auth.admin.getUserById(userId)

        if (!authData?.user) {
            return { canSend: false, reason: 'User not found' }
        }

        const lastSignIn = authData.user.last_sign_in_at

        if (!lastSignIn) {
            // Si nunca ha hecho login, permitir (es nuevo)
            return { canSend: true }
        }

        // Contar notificaciones enviadas desde el último login
        const lastSignInDate = new Date(lastSignIn)

        // Buscar en daily_summaries (resúmenes enviados)
        const { count: summariesCount } = await supabase
            .from('daily_summaries')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .not('sent_at', 'is', null)
            .gte('sent_at', lastSignInDate.toISOString())

        // TODO: Cuando exista task_reminders, también contar esos
        // const { count: remindersCount } = await supabase...

        const totalNotifications = summariesCount || 0

        console.log(`📊 [ANTI_SPAM] User ${userId}: ${totalNotifications} notifications since last login (${lastSignIn})`)

        if (totalNotifications >= MAX_NOTIFICATIONS_WITHOUT_RESPONSE) {
            return {
                canSend: false,
                reason: `User has ${totalNotifications} unresponded notifications since last login`
            }
        }

        return { canSend: true }

    } catch (error) {
        console.error('❌ [ANTI_SPAM] Error checking notification spam:', error)
        // En caso de error, permitir el envío (fail-safe)
        return { canSend: true }
    }
}

/**
 * Registra que se envió una notificación al usuario
 * Esto ya se hace automáticamente al guardar en daily_summaries
 */
export function recordNotificationSent() {
    // No necesitamos hacer nada adicional
    // El simple hecho de guardar en daily_summaries con sent_at ya lo registra
}

/**
 * Verifica la última actividad del usuario
 */
export async function getUserLastActivity(
    supabase: SupabaseClient,
    userId: string
): Promise<Date | null> {
    try {
        const { data: authData } = await supabase.auth.admin.getUserById(userId)

        if (authData?.user?.last_sign_in_at) {
            return new Date(authData.user.last_sign_in_at)
        }

        return null
    } catch (error) {
        console.error('❌ [ANTI_SPAM] Error getting user activity:', error)
        return null
    }
}
