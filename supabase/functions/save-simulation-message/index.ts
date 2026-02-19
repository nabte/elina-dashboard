import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function: save-simulation-message
 *
 * Guarda un mensaje en una sesión de simulación
 *
 * POST /functions/v1/save-simulation-message
 * Body: {
 *   session_id: string,        // UUID de la sesión
 *   role: 'user' | 'assistant',
 *   content: string,           // Contenido del mensaje
 *   metadata?: object,         // Datos adicionales (media_url, intent, etc)
 *   feedback?: 'good' | 'bad'  // Opcional: feedback del usuario
 * }
 *
 * Returns: { success: true, message_id }
 */

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse request
        const { session_id, role, content, metadata, feedback } = await req.json()

        // Validate required fields
        if (!session_id || !role || !content) {
            throw new Error('Missing required fields: session_id, role, content')
        }

        if (!['user', 'assistant'].includes(role)) {
            throw new Error('Invalid role. Must be "user" or "assistant"')
        }

        // Get auth token from request
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        // Create Supabase client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader }
                }
            }
        )

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        // Insert message
        const { data: message, error: insertError } = await supabase
            .from('simulation_messages')
            .insert({
                session_id: session_id,
                user_id: user.id,
                role: role,
                content: content,
                metadata: metadata || null,
                feedback: feedback || null
            })
            .select()
            .single()

        if (insertError) {
            console.error('[save-simulation-message] Insert error:', insertError)
            throw insertError
        }

        // Increment total_messages counter in session
        const { error: updateError } = await supabase.rpc('increment_session_counter', {
            p_session_id: session_id,
            p_field: 'total_messages'
        })

        if (updateError) {
            console.error('[save-simulation-message] Error updating counter:', updateError)
            // No throw - message was saved successfully
        }

        console.log(`✅ [save-simulation-message] Saved ${role} message to session ${session_id}`)

        return new Response(
            JSON.stringify({
                success: true,
                message_id: message.id,
                message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('[save-simulation-message] Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})
