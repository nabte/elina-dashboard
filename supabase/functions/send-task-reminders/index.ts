/**
 * SEND TASK REMINDERS
 * Edge Function para enviar recordatorios de tareas pendientes
 *
 * Ejecutado por Supabase Cron Job o manualmente
 * Analiza tareas pendientes y envía recordatorio por WhatsApp al admin
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { canSendUserNotification, incrementNotificationCounter } from '../_shared/user-notification-spam.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface TasksSummary {
    upcomingMeetings: number
    pendingQuotes: number
    unansweredContacts: number
    criticalContacts: number
}

serve(async (req) => {
    try {
        console.log('📝 [TASK_REMINDERS] Starting task reminders generation...')

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Leer parámetros del request (para modo manual)
        let isManual = false
        let manualUserId = null

        try {
            const body = await req.json()
            isManual = body?.manual === true
            manualUserId = body?.userId
        } catch {
            // Si no hay body, continuar en modo automático (cron)
        }

        console.log(`📋 [TASK_REMINDERS] Mode: ${isManual ? 'Manual' : 'Automatic (Cron)'}`)

        // ========================================================================
        // 1. OBTENER USUARIOS CON RECORDATORIOS HABILITADOS
        // ========================================================================
        let query = supabase
            .from('profiles')
            .select('id, full_name, contact_phone, evolution_api_key, evolution_api_url, evolution_instance_name')
            .eq('pending_tasks_reminder_enabled', true)
            .not('contact_phone', 'is', null)

        // Si es manual, filtrar por el userId específico
        if (isManual && manualUserId) {
            query = query.eq('id', manualUserId)
        }

        const { data: users, error: usersError } = await query

        if (usersError || !users || users.length === 0) {
            console.log('ℹ️ [TASK_REMINDERS] No users with task reminders enabled')
            return new Response(JSON.stringify({
                success: true,
                message: 'No users to process'
            }), {
                headers: { 'Content-Type': 'application/json' }
            })
        }

        console.log(`📋 [TASK_REMINDERS] Found ${users.length} user(s) with task reminders enabled`)

        const results = []

        // ========================================================================
        // 2. PROCESAR CADA USUARIO
        // ========================================================================
        for (const user of users) {
            try {
                console.log(`📊 [TASK_REMINDERS] Processing user: ${user.full_name}`)

                // ANTI-SPAM CHECK: Verificar si podemos enviar
                if (!isManual) {
                    const spamCheck = await canSendUserNotification(supabase, user.id)
                    if (!spamCheck.canSend) {
                        console.log(`⏸️ [TASK_REMINDERS] Skipping user ${user.id}: ${spamCheck.reason}`)
                        results.push({
                            userId: user.id,
                            userName: user.full_name,
                            skipped: true,
                            reason: spamCheck.reason
                        })
                        continue
                    }
                }

                // Obtener tareas pendientes
                const tasks = await getPendingTasks(supabase, user.id)

                // Si no hay tareas pendientes y no es manual, saltar
                if (!isManual && !hasPendingTasks(tasks)) {
                    console.log(`⏭️ [TASK_REMINDERS] No pending tasks for user ${user.id}`)
                    continue
                }

                // Generar mensaje de recordatorio
                const message = generateReminderMessage(user.full_name, tasks)

                // Enviar por WhatsApp
                const sent = await sendReminderMessage(
                    user.contact_phone!,
                    message,
                    user.evolution_api_key,
                    user.evolution_api_url,
                    user.evolution_instance_name
                )

                // Incrementar contador anti-spam si se envió exitosamente
                if (sent && !isManual) {
                    await incrementNotificationCounter(supabase, user.id)
                }

                results.push({
                    userId: user.id,
                    userName: user.full_name,
                    sent,
                    tasks
                })

                console.log(`✅ [TASK_REMINDERS] Reminder sent to ${user.full_name}`)

            } catch (error) {
                console.error(`❌ [TASK_REMINDERS] Error processing user ${user.id}:`, error)
                results.push({
                    userId: user.id,
                    error: error instanceof Error ? error.message : String(error)
                })
            }
        }

        return new Response(JSON.stringify({
            success: true,
            processed: results.length,
            results
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('❌ [TASK_REMINDERS] Fatal error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})

/**
 * Obtiene las tareas pendientes del usuario
 */
async function getPendingTasks(
    supabase: any,
    userId: string
): Promise<TasksSummary> {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // 1. Reuniones próximas (hoy y mañana)
    const { count: upcomingMeetings } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', todayStr)
        .lte('scheduled_at', tomorrowStr)

    // 2. Cotizaciones pendientes de seguimiento (últimos 7 días)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: pendingQuotes } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending')
        .gte('created_at', sevenDaysAgo.toISOString())

    // 3. Contactos sin responder (últimas 24 horas)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const { data: recentMessages } = await supabase
        .from('chat_history')
        .select('contact_id')
        .eq('user_id', userId)
        .eq('message_type', 'user')
        .gte('created_at', twentyFourHoursAgo.toISOString())

    const contactIds = [...new Set(recentMessages?.map((m: any) => m.contact_id) || [])]

    // Verificar cuáles no tienen respuesta del asistente
    let unansweredContacts = 0

    for (const contactId of contactIds) {
        const { data: lastMessages } = await supabase
            .from('chat_history')
            .select('message_type')
            .eq('user_id', userId)
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .limit(1)

        if (lastMessages && lastMessages[0]?.message_type === 'user') {
            unansweredContacts++
        }
    }

    // 4. Contactos críticos sin resolver
    const { count: criticalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .contains('labels', ['critico'])

    return {
        upcomingMeetings: upcomingMeetings || 0,
        pendingQuotes: pendingQuotes || 0,
        unansweredContacts,
        criticalContacts: criticalContacts || 0
    }
}

/**
 * Verifica si hay tareas pendientes
 */
function hasPendingTasks(tasks: TasksSummary): boolean {
    return tasks.upcomingMeetings > 0 ||
           tasks.pendingQuotes > 0 ||
           tasks.unansweredContacts > 0 ||
           tasks.criticalContacts > 0
}

/**
 * Genera el mensaje de recordatorio
 */
function generateReminderMessage(
    businessName: string,
    tasks: TasksSummary
): string {
    const today = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    })

    let message = `📋 *Recordatorio de Tareas - ${today}*\n\nHola ${businessName},\n\n`

    if (!hasPendingTasks(tasks)) {
        message += '✅ ¡Todo al día! No tienes tareas pendientes por ahora.\n\n'
    } else {
        message += 'Tienes las siguientes tareas pendientes:\n\n'

        if (tasks.upcomingMeetings > 0) {
            message += `📅 *${tasks.upcomingMeetings} reunión${tasks.upcomingMeetings > 1 ? 'es' : ''} próxima${tasks.upcomingMeetings > 1 ? 's' : ''}*\n`
        }

        if (tasks.pendingQuotes > 0) {
            message += `💰 *${tasks.pendingQuotes} cotización${tasks.pendingQuotes > 1 ? 'es' : ''} pendiente${tasks.pendingQuotes > 1 ? 's' : ''}* de seguimiento\n`
        }

        if (tasks.unansweredContacts > 0) {
            message += `💬 *${tasks.unansweredContacts} cliente${tasks.unansweredContacts > 1 ? 's' : ''}* esperando respuesta\n`
        }

        if (tasks.criticalContacts > 0) {
            message += `🚨 *${tasks.criticalContacts} situación${tasks.criticalContacts > 1 ? 'es' : ''} crítica${tasks.criticalContacts > 1 ? 's' : ''}* sin resolver\n`
        }

        message += '\n💡 Accede a tu dashboard para gestionar estas tareas.\n\n'
    }

    message += '_💬 Recuerda contestar estos mensajes para mantener tu servicio activo._'

    return message
}

/**
 * Envía el recordatorio por WhatsApp usando Evolution API
 */
async function sendReminderMessage(
    phoneNumber: string,
    message: string,
    apiKey: string,
    apiUrl: string,
    instanceName: string
): Promise<boolean> {
    try {
        const url = `${apiUrl}/message/sendText/${instanceName}`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify({
                number: phoneNumber.replace(/\D/g, ''),
                text: message,
                options: {
                    delay: 1200,
                    presence: 'composing',
                    linkPreview: false
                }
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Evolution API error: ${response.status} - ${error}`)
        }

        return true

    } catch (error) {
        console.error('❌ [TASK_REMINDERS] Error sending message:', error)
        return false
    }
}
