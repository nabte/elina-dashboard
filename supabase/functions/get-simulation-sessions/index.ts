import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function: get-simulation-sessions
 *
 * Obtiene la lista de sesiones de simulación del usuario
 *
 * POST /functions/v1/get-simulation-sessions
 * Body: {
 *   limit?: number  // Opcional: cuántas sesiones devolver (default: 10)
 * }
 *
 * Returns: {
 *   success: true,
 *   sessions: [...],
 *   total_count: number
 * }
 */

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse request
        const body = await req.json().catch(() => ({}))
        const limit = body.limit || 10

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

        // Get total count
        const { count, error: countError } = await supabase
            .from('simulation_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (countError) {
            console.error('[get-simulation-sessions] Count error:', countError)
        }

        // Get sessions
        const { data: sessions, error: selectError } = await supabase
            .from('simulation_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (selectError) {
            console.error('[get-simulation-sessions] Select error:', selectError)
            throw selectError
        }

        console.log(`✅ [get-simulation-sessions] Retrieved ${sessions?.length || 0} sessions for user ${user.id}`)

        return new Response(
            JSON.stringify({
                success: true,
                sessions: sessions || [],
                total_count: count || 0
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('[get-simulation-sessions] Error:', error)
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
