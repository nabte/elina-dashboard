import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function: activate-personality
 *
 * Activa o desactiva una personalidad de agente
 *
 * POST /functions/v1/activate-personality
 * Body: {
 *   personality_id: string,
 *   is_active: boolean
 * }
 *
 * Returns: {
 *   success: true,
 *   personality: { id, is_active, ... },
 *   previous_personality?: { id, ... }  // Si había otra activa que se desactivó
 * }
 */

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse request
        const {
            personality_id,
            is_active
        } = await req.json()

        // Validate required fields
        if (!personality_id || typeof is_active !== 'boolean') {
            throw new Error('Missing required fields: personality_id, is_active')
        }

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

        console.log(`[activate-personality] User ${user.id} ${is_active ? 'activating' : 'deactivating'} personality ${personality_id}`)

        // Verify personality belongs to user
        const { data: personality, error: verifyError } = await supabase
            .from('agent_personalities')
            .select('*')
            .eq('id', personality_id)
            .eq('user_id', user.id)
            .single()

        if (verifyError || !personality) {
            throw new Error('Personality not found or does not belong to user')
        }

        let previousPersonality = null

        if (is_active) {
            // If activating, deactivate any other active personality first
            const { data: activePers } = await supabase
                .from('agent_personalities')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .neq('id', personality_id)
                .maybeSingle()

            if (activePers) {
                await supabase
                    .from('agent_personalities')
                    .update({ is_active: false })
                    .eq('id', activePers.id)

                previousPersonality = activePers
                console.log(`[activate-personality] Deactivated previous personality: ${activePers.id}`)
            }
        }

        // Update personality status
        const { data: updatedPersonality, error: updateError } = await supabase
            .from('agent_personalities')
            .update({ is_active: is_active })
            .eq('id', personality_id)
            .select()
            .single()

        if (updateError) {
            console.error('[activate-personality] Error updating personality:', updateError)
            throw updateError
        }

        // Log audit event
        await supabase
            .from('personality_audit_log')
            .insert({
                personality_id: personality_id,
                user_id: user.id,
                event_type: is_active ? 'activated' : 'deactivated',
                event_data: {
                    previous_personality_id: previousPersonality?.id
                }
            })

        console.log(`✅ [activate-personality] Personality ${is_active ? 'activated' : 'deactivated'}: ${personality_id}`)

        return new Response(
            JSON.stringify({
                success: true,
                personality: updatedPersonality,
                previous_personality: previousPersonality
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('[activate-personality] Error:', error)
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
