import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { PERSONALITY_PRESETS, getPersonalityPreset, type PersonalityPreset } from '../_shared/personality-presets.ts'

/**
 * Edge Function: setup-personality
 *
 * Configura una personalidad de agente completa con análisis IA del negocio
 *
 * POST /functions/v1/setup-personality
 * Body: {
 *   personality_type: 'seller' | 'closer' | 'consultant' | 'high_ticket' | 'emotional_support',
 *   business_description: string,  // Descripción del negocio por el usuario
 *   custom_config?: object         // Configuración personalizada opcional
 * }
 *
 * Returns: {
 *   success: true,
 *   personality: { id, ... },
 *   setup_summary: {
 *     flows_created: number,
 *     faqs_created: number,
 *     tags_configured: number,
 *     followups_created: number,
 *     rag_suggested: number
 *   }
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
            personality_type,
            business_description,
            custom_config
        } = await req.json()

        // Validate required fields
        if (!personality_type || !business_description) {
            throw new Error('Missing required fields: personality_type, business_description')
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

        console.log(`[setup-personality] Starting setup for user ${user.id}, type: ${personality_type}`)

        // 1. Get personality preset
        const preset = getPersonalityPreset(personality_type)
        if (!preset) {
            throw new Error(`Invalid personality type: ${personality_type}`)
        }

        // 2. Analyze business description with AI
        console.log('[setup-personality] Analyzing business with AI...')
        const businessAnalysis = await analyzeBusinessWithAI(business_description)
        console.log('[setup-personality] Business analysis:', businessAnalysis)

        // 3. Generate custom prompt based on analysis
        const customPrompt = await generateCustomPromptWithAI(
            preset.config.prompt_additions,
            businessAnalysis
        )

        // 4. Create agent_personality record
        const { data: personality, error: personalityError } = await supabase
            .from('agent_personalities')
            .insert({
                user_id: user.id,
                personality_type: personality_type,
                business_analysis: businessAnalysis,
                config: {
                    ...preset.config,
                    custom_prompt: customPrompt
                },
                is_active: false, // No activar hasta que el usuario lo apruebe
                setup_completed: true
            })
            .select()
            .single()

        if (personalityError) {
            console.error('[setup-personality] Error creating personality:', personalityError)
            throw personalityError
        }

        console.log(`[setup-personality] Created personality: ${personality.id}`)

        // 5. Create preset responses (FAQs)
        let faqsCreated = 0
        if (preset.preset_responses.length > 0) {
            const faqs = preset.preset_responses.map(faq => ({
                user_id: user.id,
                personality_id: personality.id,
                trigger_text: faq.trigger_text,
                response_text: faq.response_text,
                match_type: faq.match_type,
                is_active: true
            }))

            const { error: faqError } = await supabase
                .from('preset_responses')
                .insert(faqs)

            if (!faqError) {
                faqsCreated = faqs.length
                console.log(`[setup-personality] Created ${faqsCreated} FAQs`)
            }
        }

        // 6. Configure auto-tags
        let tagsConfigured = 0
        if (preset.auto_tags.length > 0) {
            const tags = preset.auto_tags.map(tag => ({
                user_id: user.id,
                personality_id: personality.id,
                tag_name: tag.tag_name,
                description: tag.description,
                trigger_patterns: tag.trigger_patterns,
                is_active: true
            }))

            const { error: tagsError } = await supabase
                .from('personality_auto_tags')
                .insert(tags)

            if (!tagsError) {
                tagsConfigured = tags.length
                console.log(`[setup-personality] Configured ${tagsConfigured} auto-tags`)
            }
        }

        // 7. Create flows (if any)
        let flowsCreated = 0
        // TODO: Implementar creación de flows cuando esté lista la estructura

        // 8. Create followup templates
        let followupsCreated = 0
        if (preset.followup_templates.length > 0) {
            const followups = preset.followup_templates.map(tpl => ({
                user_id: user.id,
                personality_id: personality.id,
                template_name: tpl.template_name,
                description: tpl.description,
                trigger_event: tpl.trigger_event,
                delay_hours: tpl.delay_hours,
                message_template: tpl.message_template,
                is_active: true
            }))

            const { error: followupError } = await supabase
                .from('personality_followup_templates')
                .insert(followups)

            if (!followupError) {
                followupsCreated = followups.length
                console.log(`[setup-personality] Created ${followupsCreated} followup templates`)
            }
        }

        // 9. Create RAG suggestions
        let ragSuggested = 0
        if (preset.rag_suggestions.length > 0) {
            const ragDocs = preset.rag_suggestions.map(doc => ({
                user_id: user.id,
                personality_id: personality.id,
                title: doc.title,
                category: doc.category,
                content_template: doc.content_template,
                status: 'suggested'
            }))

            const { error: ragError } = await supabase
                .from('personality_rag_suggestions')
                .insert(ragDocs)

            if (!ragError) {
                ragSuggested = ragDocs.length
                console.log(`[setup-personality] Suggested ${ragSuggested} RAG documents`)
            }
        }

        // 10. Log audit event
        await supabase
            .from('personality_audit_log')
            .insert({
                personality_id: personality.id,
                user_id: user.id,
                event_type: 'created',
                event_data: {
                    personality_type,
                    business_analysis: businessAnalysis
                }
            })

        // Return summary
        return new Response(
            JSON.stringify({
                success: true,
                personality: personality,
                setup_summary: {
                    flows_created: flowsCreated,
                    faqs_created: faqsCreated,
                    tags_configured: tagsConfigured,
                    followups_created: followupsCreated,
                    rag_suggested: ragSuggested
                }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('[setup-personality] Error:', error)
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

/**
 * Analiza la descripción del negocio con IA
 */
async function analyzeBusinessWithAI(description: string): Promise<any> {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
        console.warn('[setup-personality] OpenAI API key not configured, using simple analysis')
        return {
            business_type: 'general',
            services: [],
            schedule: {},
            key_insights: ['Análisis básico sin IA']
        }
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un experto en análisis de negocios. Extrae información estructurada de descripciones de negocio.'
                    },
                    {
                        role: 'user',
                        content: `Analiza este negocio y extrae información clave en formato JSON:

Descripción: "${description}"

Formato esperado:
{
    "business_type": "estilista | restaurante | consultora | tienda | clínica | etc",
    "services": ["servicio 1", "servicio 2", ...],
    "schedule": {
        "monday": "9-18",
        "tuesday": "9-18",
        ...
    },
    "session_duration": 60 (en minutos, si aplica),
    "key_insights": ["insight 1", "insight 2", ...]
}

Responde SOLO con el JSON, sin texto adicional.`
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        })

        if (!response.ok) {
            throw new Error('OpenAI API error')
        }

        const data = await response.json()
        const content = data.choices[0]?.message?.content || '{}'

        // Extraer JSON de la respuesta (puede venir con ```json```)
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }

        return JSON.parse(content)

    } catch (error) {
        console.error('[setup-personality] Error analyzing business:', error)
        return {
            business_type: 'general',
            services: [],
            schedule: {},
            key_insights: ['Error en análisis IA']
        }
    }
}

/**
 * Genera prompt personalizado basado en el análisis del negocio
 */
async function generateCustomPromptWithAI(
    basePrompt: string,
    businessAnalysis: any
): Promise<string> {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
        return basePrompt // Retornar prompt base sin personalización
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un experto en personalización de prompts para asistentes IA. Adapta prompts genéricos a negocios específicos manteniendo la estructura y reglas originales.'
                    },
                    {
                        role: 'user',
                        content: `Personaliza este prompt base para el siguiente negocio:

PROMPT BASE:
${basePrompt}

INFORMACIÓN DEL NEGOCIO:
${JSON.stringify(businessAnalysis, null, 2)}

INSTRUCCIONES:
1. Mantén TODAS las "REGLAS DE ORO" del prompt base
2. Personaliza los ejemplos con productos/servicios específicos del negocio
3. Adapta el tono si el negocio lo requiere (más formal/informal según el tipo)
4. NO agregues reglas nuevas, solo personaliza las existentes
5. Mantén el mismo formato y estructura

Responde SOLO con el prompt personalizado, sin explicaciones adicionales.`
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        })

        if (!response.ok) {
            return basePrompt
        }

        const data = await response.json()
        return data.choices[0]?.message?.content || basePrompt

    } catch (error) {
        console.error('[setup-personality] Error generating custom prompt:', error)
        return basePrompt
    }
}
