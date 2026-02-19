import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function: get-personalities
 *
 * Obtiene las personalidades del usuario (todas o solo la activa)
 *
 * GET /functions/v1/get-personalities?active_only=true
 *
 * Returns: {
 *   success: true,
 *   personalities: [...],
 *   active_personality: { ... } | null
 * }
 */

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get auth token
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

        // Parse query params
        const url = new URL(req.url)
        const activeOnly = url.searchParams.get('active_only') === 'true'

        console.log(`[get-personalities] User ${user.id}, active_only: ${activeOnly}`)

        // Get personalities
        let query = supabase
            .from('agent_personalities')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (activeOnly) {
            query = query.eq('is_active', true)
        }

        const { data: personalities, error: persError } = await query

        if (persError) {
            console.error('[get-personalities] Error fetching personalities:', persError)
            throw persError
        }

        // Find active personality
        const activePersonality = personalities?.find(p => p.is_active) || null

        console.log(`✅ [get-personalities] Found ${personalities?.length || 0} personalities, active: ${activePersonality?.id || 'none'}`)

        return new Response(
            JSON.stringify({
                success: true,
                personalities: personalities || [],
                active_personality: activePersonality
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('[get-personalities] Error:', error)
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
