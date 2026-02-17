// Appointment Reminders Cron Job
// Runs hourly to send appointment reminders

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        console.log('🔔 [CRON] Checking for pending appointment reminders...')

        // ========================================================================
        // 1. FIND PENDING REMINDERS (next 60 minutes)
        // ========================================================================
        const now = new Date()
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

        const { data: reminders, error: fetchError } = await supabase
            .from('appointment_reminders')
            .select(`
                *,
                meeting:meetings(
                    id,
                    start_time,
                    status,
                    contact:contacts(
                        id,
                        phone_number,
                        full_name
                    ),
                    service:services(
                        name,
                        duration_minutes
                    ),
                    user:profiles(
                        id,
                        evolution_api_key,
                        evolution_api_url,
                        instance_name
                    )
                )
            `)
            .eq('status', 'pending')
            .gte('reminder_time', now.toISOString())
            .lte('reminder_time', oneHourLater.toISOString())

        if (fetchError) {
            throw fetchError
        }

        if (!reminders || reminders.length === 0) {
            console.log('✅ [CRON] No pending reminders found')
            return new Response(JSON.stringify({
                success: true,
                sent: 0,
                message: 'No pending reminders'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        console.log(`📨 [CRON] Found ${reminders.length} reminder(s) to send`)

        // ========================================================================
        // 2. SEND REMINDERS
        // ========================================================================
        let sent = 0
        let failed = 0

        for (const reminder of reminders) {
            try {
                const { meeting } = reminder

                // Skip if meeting is cancelled
                if (meeting.status === 'cancelled') {
                    console.log(`⏭️ [CRON] Skipping reminder for cancelled meeting #${meeting.id}`)
                    await supabase
                        .from('appointment_reminders')
                        .update({ status: 'skipped' })
                        .eq('id', reminder.id)
                    continue
                }

                const appointmentTime = new Date(meeting.start_time)
                const contact = meeting.contact
                const service = meeting.service
                const user = meeting.user

                // Format reminder message
                const reminderType = reminder.reminder_type === '24h_before' ? '24 horas' : '2 horas'

                const message =
                    `🔔 *Recordatorio de Cita*\n\n` +
                    `Te recordamos tu cita en ${reminderType}:\n\n` +
                    `📅 Fecha: ${appointmentTime.toLocaleDateString('es-MX', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    })}\n` +
                    `🕐 Hora: ${appointmentTime.toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })}\n` +
                    `🔹 Servicio: ${service.name}\n` +
                    `⏱️ Duración: ${service.duration_minutes} minutos\n\n` +
                    `¿Confirmas tu asistencia? Responde *SÍ* o *NO*.`

                // Send via Evolution API
                const evolutionUrl = `${user.evolution_api_url}/message/sendText/${user.instance_name}`

                const response = await fetch(evolutionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': user.evolution_api_key
                    },
                    body: JSON.stringify({
                        number: contact.phone_number,
                        text: message
                    })
                })

                if (!response.ok) {
                    throw new Error(`Evolution API error: ${response.status}`)
                }

                // Mark as sent
                await supabase
                    .from('appointment_reminders')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    })
                    .eq('id', reminder.id)

                sent++
                console.log(`✅ [CRON] Reminder sent for meeting #${meeting.id} to ${contact.full_name || contact.phone_number}`)

            } catch (error) {
                failed++
                console.error(`❌ [CRON] Error sending reminder #${reminder.id}:`, error)

                // Mark as failed
                await supabase
                    .from('appointment_reminders')
                    .update({
                        status: 'failed',
                        error_message: error instanceof Error ? error.message : String(error)
                    })
                    .eq('id', reminder.id)
            }
        }

        console.log(`\n📊 [CRON] Summary:`)
        console.log(`   - Total reminders: ${reminders.length}`)
        console.log(`   - Sent: ${sent}`)
        console.log(`   - Failed: ${failed}`)

        return new Response(JSON.stringify({
            success: true,
            total: reminders.length,
            sent,
            failed
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('❌ [CRON] Fatal error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
