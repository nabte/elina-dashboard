/**
 * ELINA V5 - Long-term Memory System
 * 
 * Sistema de aprendizaje de largo plazo por cuenta
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AccountLearning } from '../config/types.ts'
import { LEARNING_CONFIDENCE_THRESHOLD, RAG_MAX_RESULTS } from '../config/constants.ts'

/**
 * Genera embedding para un texto usando OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
        throw new Error('OPENAI_API_KEY not found')
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text
        })
    })

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
}

/**
 * Obtiene aprendizajes relevantes basados en el mensaje actual
 */
export async function getRelevantLearnings(
    supabase: SupabaseClient,
    userId: string,
    currentMessage: string,
    limit: number = RAG_MAX_RESULTS
): Promise<AccountLearning[]> {
    console.log(`🧠 [MEMORY] Fetching relevant learnings for user ${userId}`)

    try {
        // 1. Generar embedding del mensaje actual
        const embedding = await generateEmbedding(currentMessage)

        // 2. Buscar aprendizajes similares
        const { data, error } = await supabase.rpc('match_account_learnings', {
            query_embedding: embedding,
            match_threshold: LEARNING_CONFIDENCE_THRESHOLD,
            match_count: limit,
            filter_user_id: userId
        })

        if (error) {
            console.error(`❌ [MEMORY] Error fetching learnings: ${error.message}`)
            return []
        }

        const learnings = (data || []) as AccountLearning[]
        console.log(`✅ [MEMORY] Found ${learnings.length} relevant learnings`)

        // 3. Actualizar usage_count y last_used
        if (learnings.length > 0) {
            await Promise.all(
                learnings.map(learning =>
                    supabase
                        .from('account_learnings')
                        .update({
                            usage_count: (learning.usageCount || 0) + 1,
                            last_used: new Date().toISOString()
                        })
                        .eq('id', learning.id)
                )
            )
        }

        return learnings
    } catch (error) {
        console.error(`❌ [MEMORY] Error in getRelevantLearnings: ${error.message}`)
        return []
    }
}

/**
 * Guarda un nuevo aprendizaje
 */
export async function saveLearning(
    supabase: SupabaseClient,
    userId: string,
    learningType: 'pattern' | 'objection' | 'product_insight' | 'best_practice',
    content: string,
    confidence: number = 0.5
): Promise<void> {
    console.log(`💾 [MEMORY] Saving new learning: ${learningType}`)

    try {
        // 1. Generar embedding
        const embedding = await generateEmbedding(content)

        // 2. Guardar en base de datos
        const { error } = await supabase.from('account_learnings').insert({
            user_id: userId,
            learning_type: learningType,
            content,
            confidence,
            embedding,
            usage_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })

        if (error) {
            console.error(`❌ [MEMORY] Error saving learning: ${error.message}`)
            throw error
        }

        console.log(`✅ [MEMORY] Learning saved successfully`)
    } catch (error) {
        console.error(`❌ [MEMORY] Error in saveLearning: ${error.message}`)
        throw error
    }
}

/**
 * Actualiza la confianza de un aprendizaje
 */
export async function updateLearningConfidence(
    supabase: SupabaseClient,
    learningId: string,
    newConfidence: number
): Promise<void> {
    const { error } = await supabase
        .from('account_learnings')
        .update({
            confidence: Math.max(0, Math.min(1, newConfidence)), // Clamp between 0 and 1
            updated_at: new Date().toISOString()
        })
        .eq('id', learningId)

    if (error) {
        console.error(`❌ [MEMORY] Error updating learning confidence: ${error.message}`)
        throw error
    }
}

/**
 * Elimina aprendizajes con baja confianza y poco uso
 */
export async function cleanupOldLearnings(
    supabase: SupabaseClient,
    userId: string,
    minConfidence: number = 0.3,
    minUsageCount: number = 1,
    daysOld: number = 90
): Promise<number> {
    console.log(`🧹 [MEMORY] Cleaning up old learnings for user ${userId}`)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { data, error } = await supabase
        .from('account_learnings')
        .delete()
        .eq('user_id', userId)
        .lt('confidence', minConfidence)
        .lt('usage_count', minUsageCount)
        .lt('created_at', cutoffDate.toISOString())
        .select('id')

    if (error) {
        console.error(`❌ [MEMORY] Error cleaning up learnings: ${error.message}`)
        return 0
    }

    const deletedCount = data?.length || 0
    console.log(`✅ [MEMORY] Cleaned up ${deletedCount} old learnings`)

    return deletedCount
}

/**
 * Formatea aprendizajes para incluir en el prompt
 */
export function formatLearningsForPrompt(learnings: AccountLearning[]): string {
    if (learnings.length === 0) {
        return ''
    }

    let formatted = '## Aprendizajes Previos\n'
    formatted += 'Estos son patrones y mejores prácticas que has aprendido con el tiempo:\n\n'

    for (const learning of learnings) {
        const emoji = {
            pattern: '🔄',
            objection: '🛡️',
            product_insight: '💡',
            best_practice: '⭐'
        }[learning.learningType] || '📝'

        formatted += `${emoji} **${learning.learningType}**: ${learning.content}\n`
    }

    return formatted
}
