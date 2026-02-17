/**
 * Smart Promotions System
 * Intelligently inserts promotions into AI responses
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const GPT_MODEL = 'gpt-4o-mini'

export interface SmartPromotion {
    id: string
    title: string
    description: string
    benefits: string
    call_to_action: string
    image_urls: string[]
    max_mentions_per_day: number
    trigger_count: number
    last_triggered_at: string | null
    product_ids: number[] | null
}

export interface PromotionInsertionResult {
    shouldInsert: boolean
    promotionId?: string
    modifiedResponse?: string
    imageUrls?: string[]
}

/**
 * Gets active promotions for a user
 * @param supabase Supabase client
 * @param userId User ID
 * @returns Array of active promotions
 */
async function getActivePromotions(
    supabase: SupabaseClient,
    userId: string
): Promise<SmartPromotion[]> {
    try {
        const now = new Date().toISOString()

        const { data: promotions, error } = await supabase
            .from('smart_promotions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .eq('auto_insert', true)
            .or(`no_schedule.eq.true,and(start_at.lte.${now},end_at.gte.${now})`)

        if (error) {
            console.error(`❌ [PROMOTIONS] Error fetching promotions:`, error)
            return []
        }

        return promotions || []

    } catch (error) {
        console.error(`❌ [PROMOTIONS] Error in getActivePromotions:`, error)
        return []
    }
}

/**
 * Checks if a promotion can be mentioned today
 * @param promotion Promotion object
 * @returns True if promotion can be mentioned
 */
function canMentionToday(promotion: SmartPromotion): boolean {
    const now = new Date()
    const lastTriggered = promotion.last_triggered_at ? new Date(promotion.last_triggered_at) : null

    // Check if last triggered was today
    if (lastTriggered) {
        const isToday = lastTriggered.toDateString() === now.toDateString()

        if (isToday && promotion.trigger_count >= promotion.max_mentions_per_day) {
            console.log(`⏭️ [PROMOTIONS] Promotion "${promotion.title}" reached daily limit`)
            return false
        }
    }

    return true
}

/**
 * Selects the best promotion to insert
 * @param promotions Array of active promotions
 * @returns Selected promotion or null
 */
function selectPromotion(promotions: SmartPromotion[]): SmartPromotion | null {
    // Filter promotions that can be mentioned today
    const availablePromotions = promotions.filter(canMentionToday)

    if (availablePromotions.length === 0) {
        return null
    }

    // Prioritize promotions that haven't been triggered recently
    availablePromotions.sort((a, b) => {
        const aTime = a.last_triggered_at ? new Date(a.last_triggered_at).getTime() : 0
        const bTime = b.last_triggered_at ? new Date(b.last_triggered_at).getTime() : 0
        return aTime - bTime
    })

    return availablePromotions[0]
}

/**
 * Inserts promotion into AI response naturally
 * @param aiResponse Original AI response
 * @param promotion Promotion to insert
 * @returns Modified response with promotion
 */
async function insertPromotionNaturally(
    aiResponse: string,
    promotion: SmartPromotion
): Promise<string> {
    try {
        console.log(`🎯 [PROMOTIONS] Inserting promotion: ${promotion.title}`)

        const systemPrompt = `Eres un asistente que integra promociones de manera natural en respuestas de chat.

Tu tarea es tomar una respuesta existente y agregar una mención de la siguiente promoción de manera fluida y natural, sin que se sienta forzado.

Promoción:
- Título: ${promotion.title}
- Descripción: ${promotion.description}
- Beneficios: ${promotion.benefits}
- Call to Action: ${promotion.call_to_action}

Reglas:
1. La mención debe ser breve y natural
2. Debe fluir con el contexto de la respuesta original
3. Incluye el call to action de manera sutil
4. No uses frases como "Por cierto" o "Además"
5. Mantén el tono conversacional

Responde SOLO con la respuesta modificada, sin explicaciones adicionales.`

        const userPrompt = `Respuesta original:
"${aiResponse}"

Inserta la promoción de manera natural.`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GPT_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`OpenAI API error: ${error}`)
        }

        const data = await response.json()
        const modifiedResponse = data.choices[0].message.content.trim()

        console.log(`✅ [PROMOTIONS] Promotion inserted successfully`)

        return modifiedResponse

    } catch (error) {
        console.error(`❌ [PROMOTIONS] Error inserting promotion:`, error)
        return aiResponse // Return original response on error
    }
}

/**
 * Records promotion insertion
 * @param supabase Supabase client
 * @param promotionId Promotion ID
 * @param userId User ID
 * @param contactId Contact ID
 */
async function recordPromotionInsertion(
    supabase: SupabaseClient,
    promotionId: string,
    userId: string,
    contactId: number
): Promise<void> {
    try {
        // Insert record
        await supabase
            .from('smart_promotion_insertions')
            .insert({
                promotion_id: promotionId,
                user_id: userId,
                contact_id: contactId
            })

        // Update promotion stats
        const now = new Date()
        const { data: promotion } = await supabase
            .from('smart_promotions')
            .select('last_triggered_at, trigger_count')
            .eq('id', promotionId)
            .single()

        if (promotion) {
            const lastTriggered = promotion.last_triggered_at ? new Date(promotion.last_triggered_at) : null
            const isToday = lastTriggered && lastTriggered.toDateString() === now.toDateString()

            await supabase
                .from('smart_promotions')
                .update({
                    last_triggered_at: now.toISOString(),
                    trigger_count: isToday ? promotion.trigger_count + 1 : 1
                })
                .eq('id', promotionId)
        }

        console.log(`✅ [PROMOTIONS] Insertion recorded`)

    } catch (error) {
        console.error(`❌ [PROMOTIONS] Error recording insertion:`, error)
    }
}

/**
 * Processes smart promotions for a conversation
 * @param supabase Supabase client
 * @param userId User ID
 * @param contactId Contact ID
 * @param aiResponse Original AI response
 * @returns Promotion insertion result
 */
export async function processSmartPromotions(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    aiResponse: string
): Promise<PromotionInsertionResult> {
    try {
        console.log(`\n🎁 [PROMOTIONS] Processing smart promotions...`)

        // Get active promotions
        const promotions = await getActivePromotions(supabase, userId)

        if (promotions.length === 0) {
            console.log(`ℹ️ [PROMOTIONS] No active promotions`)
            return { shouldInsert: false }
        }

        console.log(`📋 [PROMOTIONS] Found ${promotions.length} active promotions`)

        // Select best promotion
        const selectedPromotion = selectPromotion(promotions)

        if (!selectedPromotion) {
            console.log(`ℹ️ [PROMOTIONS] No eligible promotion for insertion`)
            return { shouldInsert: false }
        }

        // Insert promotion naturally
        const modifiedResponse = await insertPromotionNaturally(aiResponse, selectedPromotion)

        // Record insertion
        await recordPromotionInsertion(supabase, selectedPromotion.id, userId, contactId)

        console.log(`✅ [PROMOTIONS] Promotion processed successfully`)

        return {
            shouldInsert: true,
            promotionId: selectedPromotion.id,
            modifiedResponse,
            imageUrls: selectedPromotion.image_urls
        }

    } catch (error) {
        console.error(`❌ [PROMOTIONS] Error processing promotions:`, error)
        return { shouldInsert: false }
    }
}
