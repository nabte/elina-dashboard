import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Send Appointment Reminders Function Started v3.0 (Debug)")

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Missing Supabase Env Vars")
            throw new Error("Missing Supabase Env Vars")
        }

        const supabase = createClient(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        )

        const now = new Date()

        /**
         * Formato para WhatsApp en México: 52 + 1 + 10 dígitos.
         * A veces los números se guardan como 52999... y necesitan el '1'.
         */
        function formatMexicanNumber(phone: string): string {
            let clean = phone.replace(/\D/g, "")
            // Si empieza con 52 y tiene 12 dígitos (52 + 10), le falta el 1 intermedio
            if (clean.startsWith("52") && clean.length === 12 && clean[2] !== "1") {
                clean = "521" + clean.substring(2)
            }
            return clean
        }

        // Check for manual trigger
        let manualAppointmentId: string | null = null
        try {
            if (req.method === 'POST') {
                const text = await req.text(); // Read as text first to avoid JSON errors crashing everything
                if (text) {
                    const body = JSON.parse(text)
                    manualAppointmentId = body.appointment_id
                }
            }
        } catch (e) {
            console.warn("Error parsing request body:", e)
        }

        if (manualAppointmentId) {
            console.log(`>>> [REMINDERS] Manual trigger for appointment ${manualAppointmentId}`)

            // 1. Fetch meeting details
            const { data: meeting, error: meetingError } = await supabase
                .from('meetings')
                .select('*, contacts:contact_id(*)')
                .eq('id', manualAppointmentId)
                .single()

            if (meetingError || !meeting) {
                console.error("Meeting fetch error:", meetingError)
                return new Response(JSON.stringify({ error: 'Meeting not found', details: meetingError }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404
                })
            }

            // 2. Fetch Profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('evolution_instance_name, evolution_api_key, evolution_api_url')
                .eq('id', meeting.user_id)
                .single()

            if (profileError || !profile) {
                console.error("Profile fetch error:", profileError)
                return new Response(JSON.stringify({ error: 'Profile not found', details: profileError }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404
                })
            }

            const contact = meeting.contacts
            // Check if contact is array or object (Supabase join can be quirky)
            const contactData = Array.isArray(contact) ? contact[0] : contact;

            if (!contactData || !contactData.phone_number) {
                console.error("Contact phone error:", contact)
                return new Response(JSON.stringify({ error: 'Contact phone not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                })
            }

            // 3. Send Message
            const appointmentDate = new Date(meeting.start_time)
            const dateStr = appointmentDate.toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'America/Mexico_City'
            })
            const timeStr = appointmentDate.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Mexico_City'
            })

            const message = `Hola ${contactData.full_name} 👋

Solo para recordarte tu cita:
📋 *${meeting.summary}*
📅 ${dateStr}
🕐 ${timeStr}

Si tienes algún inconveniente, por favor avísame para reagendar.

¡Que tengas un excelente día!`

            // Use provided URL or Default
            let evolutionUrl = profile.evolution_api_url
            if (!evolutionUrl) {
                evolutionUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evolutionapi-evolution-api.mcjhhb.easypanel.host'
            }
            const evolutionUrlClean = evolutionUrl.replace(/\/$/, "")

            const sendUrl = `${evolutionUrlClean}/message/sendText/${profile.evolution_instance_name}`
            const formattedPhone = formatMexicanNumber(contactData.phone_number)

            console.log(`Sending manual reminder to ${formattedPhone} via ${sendUrl}`)

            try {
                const sendResponse = await fetch(sendUrl, {
                    method: 'POST',
                    headers: {
                        'apikey': profile.evolution_api_key,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        number: formattedPhone,
                        text: message,
                        delay: 1500,
                        linkPreview: false
                    })
                })

                if (!sendResponse.ok) {
                    const errorText = await sendResponse.text()
                    console.error(`Error sending manual reminder (Status ${sendResponse.status}): ${errorText}`)

                    // Check if it's a "number doesn't exist" error
                    let userMessage = 'Failed to send WhatsApp message'
                    if (errorText.includes('"exists":false')) {
                        userMessage = `El número ${contactData.phone_number} no está registrado en WhatsApp o no existe.`
                    }

                    return new Response(JSON.stringify({
                        error: userMessage,
                        details: errorText,
                        provider_status: sendResponse.status
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 400 // Client error - invalid phone number
                    })
                }

                console.log("Manual reminder sent successfully")
                return new Response(JSON.stringify({ success: true, message: 'Manual reminder sent' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                })

            } catch (fetchErr) {
                console.error("Fetch Exception calling Evolution:", fetchErr)
                return new Response(JSON.stringify({
                    error: 'Network error calling Evolution API',
                    details: fetchErr.message
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500
                })
            }
        }

        console.log(`>>> [REMINDERS] Checking for pending reminders at ${now.toISOString()}`)

        // 1. Get pending reminders that are due
        const { data: pendingReminders, error: fetchError } = await supabase
            .from('appointment_reminders')
            .select(`
                *,
                meetings!inner(
                    id,
                    start_time,
                    summary,
                    contact_id,
                    product_id,
                    user_id,
                    status
                )
            `)
            .eq('status', 'pending')
            .lte('scheduled_for', now.toISOString())
            .limit(50)

        if (fetchError) {
            console.error('!!! [ERROR] Failed to fetch reminders:', fetchError)
            return new Response(JSON.stringify({ error: fetchError.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            })
        }

        if (!pendingReminders || pendingReminders.length === 0) {
            console.log('--- [REMINDERS] No pending reminders found')
            return new Response(JSON.stringify({
                message: 'No pending reminders',
                processed: 0,
                timestamp: now.toISOString()
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        console.log(`+++ [REMINDERS] Found ${pendingReminders.length} pending reminders`)

        let successCount = 0
        let failCount = 0

        // 2. Process each reminder
        for (const reminder of pendingReminders) {
            try {
                const meeting = reminder.meetings

                // Skip if meeting is cancelled
                if (meeting.status === 'cancelled') {
                    console.log(`--- [SKIP] Meeting ${meeting.id} is cancelled`)
                    await supabase
                        .from('appointment_reminders')
                        .update({ status: 'cancelled' })
                        .eq('id', reminder.id)
                    continue
                }

                // Get contact info
                const { data: contact, error: contactError } = await supabase
                    .from('contacts')
                    .select('phone_number, full_name')
                    .eq('id', meeting.contact_id)
                    .single()

                if (contactError || !contact) {
                    console.error(`!!! [ERROR] Contact not found for meeting ${meeting.id}`)
                    failCount++
                    continue
                }

                // Get profile/instance info
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('evolution_instance_name, evolution_api_key, evolution_api_url')
                    .eq('id', meeting.user_id)
                    .single()

                if (profileError || !profile) {
                    console.error(`!!! [ERROR] Profile not found for user ${meeting.user_id}`)
                    failCount++
                    continue
                }

                // Format date/time
                const appointmentDate = new Date(meeting.start_time)
                const dateStr = appointmentDate.toLocaleDateString('es-MX', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'America/Mexico_City'
                })
                const timeStr = appointmentDate.toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Mexico_City'
                })

                // Build reminder message
                const message = reminder.message || `Hola ${contact.full_name} 👋

Solo para recordarte tu cita:
📋 *${meeting.summary}*
📅 ${dateStr}
🕐 ${timeStr}

Si tienes algún inconveniente, por favor avísame para reagendar.

¡Que tengas un excelente día!`

                // Send via Evolution API
                let evolutionUrl = profile.evolution_api_url
                if (!evolutionUrl) {
                    evolutionUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evolutionapi-evolution-api.mcjhhb.easypanel.host'
                }
                const evolutionUrlClean = evolutionUrl.replace(/\/$/, "")

                const sendUrl = `${evolutionUrlClean}/message/sendText/${profile.evolution_instance_name}`
                const formattedPhone = formatMexicanNumber(contact.phone_number)

                const sendResponse = await fetch(sendUrl, {
                    method: 'POST',
                    headers: {
                        'apikey': profile.evolution_api_key,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        number: formattedPhone,
                        text: message,
                        delay: 1500,
                        linkPreview: false
                    })
                })

                if (!sendResponse.ok) {
                    const errorText = await sendResponse.text()
                    console.error(`!!! [ERROR] Failed to send reminder ${reminder.id}:`, errorText)

                    await supabase
                        .from('appointment_reminders')
                        .update({
                            status: 'failed',
                            error_message: errorText.substring(0, 500)
                        })
                        .eq('id', reminder.id)

                    failCount++
                    continue
                }

                // Mark as sent
                await supabase
                    .from('appointment_reminders')
                    .update({
                        status: 'sent',
                        sent_at: now.toISOString()
                    })
                    .eq('id', reminder.id)

                console.log(`+++ [SUCCESS] Reminder ${reminder.id} sent to ${contact.phone_number}`)
                successCount++

            } catch (err) {
                console.error(`!!! [ERROR] Exception processing reminder ${reminder.id}:`, err)

                await supabase
                    .from('appointment_reminders')
                    .update({
                        status: 'failed',
                        error_message: err.message?.substring(0, 500) || 'Unknown error'
                    })
                    .eq('id', reminder.id)

                failCount++
            }
        }

        console.log(`>>> [REMINDERS] Completed: ${successCount} sent, ${failCount} failed`)

        return new Response(JSON.stringify({
            success: true,
            processed: pendingReminders.length,
            sent: successCount,
            failed: failCount,
            timestamp: now.toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error: any) {
        console.error('!!! [FATAL ERROR]:', error)
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
