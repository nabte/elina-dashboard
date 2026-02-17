import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../process-chat-message/cors.ts"

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get user ID from JWT
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Get edge function config for this user
        const { data: config, error } = await supabase
            .from('edge_function_config')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error
        }

        // If no config exists, return defaults
        if (!config) {
            const defaultConfig = {
                user_id: user.id,
                llm_model: 'gpt-5-nano-2025-08-07',
                max_tokens: 2000,
                temperature: 0.7,
                inventory_injection_mode: 'conditional',
                enable_appointment_detection: true,
                enable_product_detection: true,
                enable_quote_detection: true,
                enable_critical_detection: true,
                enable_sentiment_analysis: true,
                enable_user_preferences: false,
                base_prompt: "Eres ELINA, una asistente virtual útil.",
                personality_context: null, // Will be filled by UI placeholders or code logic
                placeholder_instructions: null,
                appointment_rules: null
            }
            // Import defaults dynamically if needed, or leave null to let UI show placeholders?
            // User requested to SEE the configuration.
            // Let's return the HARDCODED defaults from the shared file.

            const { DEFAULT_BASE_PROMPT, DEFAULT_PERSONALITY_CONTEXT, DEFAULT_PLACEHOLDER_INSTRUCTIONS, DEFAULT_APPOINTMENT_RULES } = await import('../_shared/prompt-defaults.ts')

            defaultConfig.base_prompt = DEFAULT_BASE_PROMPT;
            defaultConfig.personality_context = DEFAULT_PERSONALITY_CONTEXT;
            defaultConfig.placeholder_instructions = DEFAULT_PLACEHOLDER_INSTRUCTIONS;
            defaultConfig.appointment_rules = DEFAULT_APPOINTMENT_RULES;

            return new Response(JSON.stringify(defaultConfig), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Merge with defaults if fields are null
        const { DEFAULT_BASE_PROMPT, DEFAULT_PERSONALITY_CONTEXT, DEFAULT_PLACEHOLDER_INSTRUCTIONS, DEFAULT_APPOINTMENT_RULES } = await import('../_shared/prompt-defaults.ts')

        const effectiveConfig = {
            ...config,
            base_prompt: config.base_prompt || DEFAULT_BASE_PROMPT,
            personality_context: config.personality_context || DEFAULT_PERSONALITY_CONTEXT,
            placeholder_instructions: config.placeholder_instructions || DEFAULT_PLACEHOLDER_INSTRUCTIONS,
            appointment_rules: config.appointment_rules || DEFAULT_APPOINTMENT_RULES
        }

        return new Response(JSON.stringify(effectiveConfig), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

        return new Response(JSON.stringify(config), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
