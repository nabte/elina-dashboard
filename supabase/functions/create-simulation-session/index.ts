import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function: create-simulation-session
 *
 * Crea una nueva sesión de simulación para el usuario
 *
 * POST /functions/v1/create-simulation-session
 * Body: {
 *   session_name?: string,     // Opcional: nombre personalizado
 *   draft_prompt?: string,     // Opcional: contenido del prompt draft
 *   prompt_version_id?: string // Opcional: UUID de la versión del prompt
 * }
 *
 * Returns: { id, session_name, created_at, ... }
 */

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse request
        const { session_name, draft_prompt, prompt_version_id } = await req.json()

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

        // Generate session name if not provided
        const finalSessionName = session_name || `Simulación ${new Date().toLocaleString('es-MX', {
            dateStyle: 'short',
            timeStyle: 'short'
        })}`

        // Insert new session
        const { data: session, error: insertError } = await supabase
            .from('simulation_sessions')
            .insert({
                user_id: user.id,
                session_name: finalSessionName,
                draft_prompt: draft_prompt || null,
                prompt_version_id: prompt_version_id || null,
                total_messages: 0,
                good_examples_count: 0,
                bad_examples_count: 0
            })
            .select()
            .single()

        if (insertError) {
            console.error('[create-simulation-session] Insert error:', insertError)
            throw insertError
        }

        console.log(`✅ [create-simulation-session] Created session ${session.id} for user ${user.id}`)

        return new Response(
            JSON.stringify({
                success: true,
                session
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('[create-simulation-session] Error:', error)
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
