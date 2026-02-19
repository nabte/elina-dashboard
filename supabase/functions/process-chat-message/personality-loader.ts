/**
 * PERSONALITY LOADER
 *
 * Carga la personalidad activa del usuario y la integra con la configuración del agente
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AgentConfig } from './agent.ts'

export interface PersonalityConfig {
    id: string
    personality_type: string
    config: {
        prompt_additions?: string
        custom_prompt?: string
        temperature?: number
        max_response_length?: number
        use_emojis?: boolean
        formality_level?: 'formal' | 'casual' | 'friendly'
        sales_aggressiveness?: 'low' | 'medium' | 'high'
        tools_enabled?: string[]
        smart_followups?: boolean
        auto_suggest_products?: boolean
        rag_priority?: 'high' | 'medium' | 'low'
    }
    business_analysis?: any
}

/**
 * Carga la personalidad activa del usuario
 */
export async function loadActivePersonality(
    supabase: SupabaseClient,
    userId: string
): Promise<PersonalityConfig | null> {
    console.log(`... [PERSONALITY] Buscando personalidad activa para usuario ${userId}`)

    const { data, error } = await supabase
        .from('agent_personalities')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

    if (error) {
        console.error('!!! [PERSONALITY] Error cargando personalidad:', error)
        return null
    }

    if (!data) {
        console.log('... [PERSONALITY] No hay personalidad activa')
        return null
    }

    console.log(`+++ [PERSONALITY] Personalidad activa encontrada: ${data.personality_type} (ID: ${data.id})`)
    return data as PersonalityConfig
}

/**
 * Integra la configuración de personalidad con el AgentConfig
 */
export function mergePersonalityConfig(
    baseConfig: Partial<AgentConfig>,
    personality: PersonalityConfig | null,
    systemPrompt: string
): Partial<AgentConfig> {
    if (!personality) {
        return baseConfig
    }

    console.log(`... [PERSONALITY] Aplicando personalidad: ${personality.personality_type}`)

    const config = personality.config || {}
    const updatedConfig: Partial<AgentConfig> = { ...baseConfig }

    // 1. Merge system prompt with personality additions
    if (config.custom_prompt) {
        // Si hay custom_prompt, úsalo como base y agrega el original como contexto adicional
        console.log('    → Usando custom_prompt de personalidad')
        updatedConfig.basePrompt = `${config.custom_prompt}\n\n---\n\n${systemPrompt}`
    } else if (config.prompt_additions) {
        // Si solo hay additions, agrégalos al final
        console.log('    → Agregando prompt_additions')
        updatedConfig.basePrompt = `${systemPrompt}\n\n---\n\n**INSTRUCCIONES ADICIONALES DE PERSONALIDAD:**\n${config.prompt_additions}`
    }

    // 2. Merge temperatura si está definida
    if (config.temperature !== undefined) {
        console.log(`    → Temperatura ajustada: ${config.temperature}`)
        updatedConfig.temperature = config.temperature
    }

    // 3. Merge herramientas habilitadas
    if (config.tools_enabled && config.tools_enabled.length > 0) {
        console.log(`    → Herramientas personalizadas: ${config.tools_enabled.join(', ')}`)
        updatedConfig.enabledTools = config.tools_enabled
    }

    // 4. Agregar contexto de personalidad
    const personalityContext = buildPersonalityContext(personality)
    updatedConfig.personalityContext = `${baseConfig.personalityContext || ''}\n\n${personalityContext}`

    console.log('+++ [PERSONALITY] Configuración integrada exitosamente')
    return updatedConfig
}

/**
 * Construye contexto adicional basado en la personalidad
 */
function buildPersonalityContext(personality: PersonalityConfig): string {
    const config = personality.config || {}
    let context = `**PERSONALIDAD ACTIVA:** ${personality.personality_type}\n`

    if (config.formality_level) {
        const formalityMap = {
            formal: 'Mantén un tono formal y profesional',
            casual: 'Usa un tono casual y relajado',
            friendly: 'Sé amigable y cercano, como un amigo'
        }
        context += `- Tono: ${formalityMap[config.formality_level]}\n`
    }

    if (config.use_emojis !== undefined) {
        context += config.use_emojis
            ? '- Usa emojis para hacer la conversación más amigable 😊\n'
            : '- NO uses emojis, mantén la comunicación textual pura\n'
    }

    if (config.sales_aggressiveness) {
        const aggressivenessMap = {
            low: 'Sé sutil y paciente con las ventas, enfócate en educar',
            medium: 'Balancea educación con oportunidades de venta',
            high: 'Sé proactivo en cerrar ventas y generar conversiones'
        }
        context += `- Estrategia de ventas: ${aggressivenessMap[config.sales_aggressiveness]}\n`
    }

    if (config.auto_suggest_products) {
        context += '- Auto-sugerencias: Si mencionas que no hay algo, sugiere alternativas automáticamente\n'
    }

    if (config.smart_followups) {
        context += '- Seguimientos inteligentes: Programa recordatorios para clientes inactivos\n'
    }

    if (personality.business_analysis) {
        const analysis = personality.business_analysis
        context += '\n**ANÁLISIS DEL NEGOCIO:**\n'

        if (analysis.business_type) {
            context += `- Tipo: ${analysis.business_type}\n`
        }

        if (analysis.services && analysis.services.length > 0) {
            context += `- Servicios principales: ${analysis.services.join(', ')}\n`
        }

        if (analysis.key_insights && analysis.key_insights.length > 0) {
            context += `- Insights clave:\n`
            analysis.key_insights.forEach((insight: string) => {
                context += `  * ${insight}\n`
            })
        }
    }

    return context.trim()
}

/**
 * Carga FAQs y auto-tags asociados a la personalidad
 */
export async function loadPersonalityExtensions(
    supabase: SupabaseClient,
    personalityId: string,
    userId: string
): Promise<{
    faqs: any[]
    autoTags: any[]
    followupTemplates: any[]
}> {
    console.log(`... [PERSONALITY] Cargando extensiones para personalidad ${personalityId}`)

    // Load preset responses (FAQs) linked to personality
    const { data: faqs } = await supabase
        .from('preset_responses')
        .select('*')
        .eq('personality_id', personalityId)
        .eq('is_active', true)

    // Load auto-tags
    const { data: autoTags } = await supabase
        .from('personality_auto_tags')
        .select('*')
        .eq('personality_id', personalityId)
        .eq('is_active', true)

    // Load followup templates
    const { data: followupTemplates } = await supabase
        .from('personality_followup_templates')
        .select('*')
        .eq('personality_id', personalityId)
        .eq('is_active', true)

    console.log(`+++ [PERSONALITY] Cargadas ${faqs?.length || 0} FAQs, ${autoTags?.length || 0} auto-tags, ${followupTemplates?.length || 0} templates`)

    return {
        faqs: faqs || [],
        autoTags: autoTags || [],
        followupTemplates: followupTemplates || []
    }
}
