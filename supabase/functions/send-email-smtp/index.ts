/**
 * SEND EMAIL SMTP
 * Edge Function para enviar emails usando configuración SMTP del usuario
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface EmailRequest {
    userId: string
    to: string
    subject: string
    body: string
    bodyHtml?: string
}

serve(async (req) => {
    try {
        console.log('📧 [SEND_EMAIL_SMTP] Processing email request...')

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Parse request body
        const { userId, to, subject, body, bodyHtml }: EmailRequest = await req.json()

        if (!userId || !to || !subject || !body) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required fields: userId, to, subject, body'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // ========================================================================
        // 1. OBTENER CONFIGURACIÓN SMTP DEL USUARIO
        // ========================================================================
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('smtp_config, error_notifications_enabled, notification_email, full_name')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            console.error('❌ [SEND_EMAIL_SMTP] Error fetching profile:', profileError)
            return new Response(JSON.stringify({
                success: false,
                error: 'User profile not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Verificar si las notificaciones están habilitadas
        if (!profile.error_notifications_enabled) {
            console.log('ℹ️ [SEND_EMAIL_SMTP] Email notifications disabled for user')
            return new Response(JSON.stringify({
                success: false,
                error: 'Email notifications are disabled for this user'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Verificar si existe configuración SMTP
        if (!profile.smtp_config) {
            console.error('❌ [SEND_EMAIL_SMTP] No SMTP configuration found')
            return new Response(JSON.stringify({
                success: false,
                error: 'SMTP configuration not found for user'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const smtpConfig = typeof profile.smtp_config === 'string'
            ? JSON.parse(profile.smtp_config)
            : profile.smtp_config

        // Validar configuración SMTP
        if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password || !smtpConfig.from_email) {
            console.error('❌ [SEND_EMAIL_SMTP] Incomplete SMTP configuration')
            return new Response(JSON.stringify({
                success: false,
                error: 'Incomplete SMTP configuration'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // ========================================================================
        // 2. CONFIGURAR CLIENTE SMTP
        // ========================================================================
        const client = new SMTPClient({
            connection: {
                hostname: smtpConfig.host,
                port: smtpConfig.port || 587,
                tls: smtpConfig.secure || false,
                auth: {
                    username: smtpConfig.user,
                    password: smtpConfig.password
                }
            }
        })

        console.log(`📤 [SEND_EMAIL_SMTP] Connecting to SMTP server: ${smtpConfig.host}:${smtpConfig.port}`)

        // ========================================================================
        // 3. ENVIAR EMAIL
        // ========================================================================
        await client.send({
            from: `${smtpConfig.from_name || 'ELINA IA'} <${smtpConfig.from_email}>`,
            to: to,
            subject: subject,
            content: body,
            html: bodyHtml || undefined
        })

        await client.close()

        console.log(`✅ [SEND_EMAIL_SMTP] Email sent successfully to ${to}`)

        return new Response(JSON.stringify({
            success: true,
            message: 'Email sent successfully',
            to: to
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('❌ [SEND_EMAIL_SMTP] Fatal error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
