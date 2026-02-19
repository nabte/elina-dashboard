/**
 * ELINA HEAD WEBHOOK
 * Webhook para la instancia compartida ElinaHead
 *
 * Recibe mensajes de respuesta de los usuarios y resetea el contador anti-spam
 * Esta instancia SOLO maneja notificaciones salientes, no conversaciones
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resetNotificationCounter } from '../_shared/user-notification-spam.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
    try {
        const payload = await req.json()

        console.log('📨 [ELINA_HEAD] Webhook received')

        // ========================================================================
        // 1. VALIDAR DATOS DEL WEBHOOK
        // ========================================================================
        const data = payload?.data
        if (!data) {
            console.error('❌ [ELINA_HEAD] Invalid payload: missing data')
            return new Response(JSON.stringify({ error: 'Invalid payload' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const { key, message, pushName } = data
        let remoteJid = key?.remoteJid

        // Handle .LID (Linked Devices)
        if (remoteJid?.includes('@lid')) {
            remoteJid = key?.remoteJidAlt || remoteJid
        }

        // Clean suffix
        const phoneNumber = remoteJid?.replace('@s.whatsapp.net', '')
        const messageId = key?.id
        const instanceName = payload?.instance

        console.log(`📋 [ELINA_HEAD] Instance: ${instanceName}`)
        console.log(`📋 [ELINA_HEAD] Phone: ${phoneNumber}`)
        console.log(`📋 [ELINA_HEAD] Message ID: ${messageId}`)

        // Validar que sea la instancia ElinaHead
        if (instanceName !== 'ElinaHead') {
            console.warn(`⚠️ [ELINA_HEAD] Wrong instance: ${instanceName}`)
            return new Response(JSON.stringify({
                success: false,
                error: 'Wrong instance'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Validar required fields
        if (!phoneNumber || !messageId) {
            console.error('❌ [ELINA_HEAD] Missing required fields')
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // ========================================================================
        // 2. IGNORAR MENSAJES SALIENTES
        // ========================================================================
        const messageType = message?.messageType
        const fromMe = key?.fromMe

        if (fromMe) {
            console.log('ℹ️ [ELINA_HEAD] Ignoring outgoing message')
            return new Response(JSON.stringify({ success: true, ignored: true }), {
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // ========================================================================
        // 3. PROCESAR MENSAJE ENTRANTE (Respuesta del Usuario)
        // ========================================================================
        console.log(`✅ [ELINA_HEAD] User ${phoneNumber} responded`)

        // Resetear contador anti-spam
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        await resetNotificationCounter(supabase, phoneNumber)

        return new Response(JSON.stringify({
            success: true,
            message: 'Notification counter reset',
            phoneNumber
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('❌ [ELINA_HEAD] Fatal error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
