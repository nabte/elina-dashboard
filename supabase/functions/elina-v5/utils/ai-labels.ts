/**
 * AI Labels System
 * Automatically applies labels to contacts based on conversation analysis
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const GPT_MODEL = 'gpt-4o-mini'

export interface AutoLabel {
    id: string
    name: string
    prompt: string
    automation_condition: string
}

export interface LabelDetectionResult {
    shouldApply: boolean
    labelName: string
    reason: string
    confidence: number
}

/**
 * Gets all automated labels for a user
 * @param supabase Supabase client
 * @param userId User ID
 * @returns Array of automated labels
 */
async function getAutomatedLabels(
    supabase: SupabaseClient,
    userId: string
): Promise<AutoLabel[]> {
    try {
        const { data: labels, error } = await supabase
            .from('labels')
            .select('id, name, prompt, automation_condition')
            .eq('user_id', userId)
            .eq('is_automated', true)

        if (error) {
            console.error(`❌ [AI_LABELS] Error fetching automated labels:`, error)
            return []
        }

        return labels || []

    } catch (error) {
        console.error(`❌ [AI_LABELS] Error in getAutomatedLabels:`, error)
        return []
    }
}

/**
 * Evaluates if a label should be applied based on conversation context
 * @param label Auto label configuration
 * @param messageText User message
 * @param conversationContext Recent conversation history
 * @returns Detection result
 */
async function evaluateLabelCondition(
    label: AutoLabel,
    messageText: string,
    conversationContext: string
): Promise<LabelDetectionResult> {
    try {
        // console.log(`🤖 [AI_LABELS] Evaluating label: ${label.name}`)

        // Build prompt for GPT
        const systemPrompt = `Eres un asistente que analiza conversaciones para determinar si se debe aplicar una etiqueta específica a un contacto.

Etiqueta a evaluar: "${label.name}"
Condición de automatización: ${label.automation_condition}
Instrucciones adicionales: ${label.prompt || 'Ninguna'}

Analiza la conversación y determina:
1. Si se debe aplicar la etiqueta (true/false)
2. La razón específica por la que se debe o no aplicar
3. Tu nivel de confianza (0-1)

Responde SOLO con un JSON en este formato:
{
  "shouldApply": boolean,
  "reason": "string explicando por qué",
  "confidence": number entre 0 y 1
}`

        const userPrompt = `Contexto de la conversación:
${conversationContext}

Último mensaje del usuario:
"${messageText}"

¿Se debe aplicar la etiqueta "${label.name}"?`

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
                temperature: 0.3,
                max_tokens: 200
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`OpenAI API error: ${error}`)
        }

        const data = await response.json()
        const resultText = data.choices[0].message.content.trim()

        // Parse JSON response
        const result = JSON.parse(resultText)

        // console.log(`✅ [AI_LABELS] Evaluation complete: ${result.shouldApply ? 'APPLY' : 'SKIP'}`)
        // console.log(`   Reason: ${result.reason}`)
        // console.log(`   Confidence: ${result.confidence}`)

        return {
            shouldApply: result.shouldApply,
            labelName: label.name,
            reason: result.reason,
            confidence: result.confidence
        }

    } catch (error) {
        console.error(`❌ [AI_LABELS] Error evaluating label:`, error)
        return {
            shouldApply: false,
            labelName: label.name,
            reason: 'Error en evaluación',
            confidence: 0
        }
    }
}

/**
 * Applies a label to a contact
 * @param supabase Supabase client
 * @param contactId Contact ID
 * @param labelName Label name to apply
 * @param reason Reason for applying the label
 */
async function applyLabelToContact(
    supabase: SupabaseClient,
    contactId: number,
    labelName: string,
    reason: string
): Promise<void> {
    try {
        // Get current labels
        const { data: contact } = await supabase
            .from('contacts')
            .select('labels')
            .eq('id', contactId)
            .single()

        if (!contact) {
            throw new Error('Contact not found')
        }

        const currentLabels = contact.labels || []

        // Check if label already exists
        if (currentLabels.includes(labelName)) {
            // console.log(`ℹ️ [AI_LABELS] Label "${labelName}" already applied`)
            return
        }

        // Add new label
        const updatedLabels = [...currentLabels, labelName]

        // Update contact
        const { error } = await supabase
            .from('contacts')
            .update({
                labels: updatedLabels,
                razon_de_label_auto: reason
            })
            .eq('id', contactId)

        if (error) {
            throw error
        }

        // console.log(`✅ [AI_LABELS] Label "${labelName}" applied to contact ${contactId}`)

    } catch (error) {
        console.error(`❌ [AI_LABELS] Error applying label:`, error)
        throw error
    }
}

/**
 * Processes AI labels for a conversation
 * @param supabase Supabase client
 * @param userId User ID
 * @param contactId Contact ID
 * @param messageText Current message text
 * @param conversationContext Recent conversation history
 * @returns Array of applied labels
 */
export async function processAILabels(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    messageText: string,
    conversationContext: string
): Promise<string[]> {
    try {
        // console.log(`\n🏷️ [AI_LABELS] Processing AI labels...`)

        // Get automated labels
        const automatedLabels = await getAutomatedLabels(supabase, userId)

        if (automatedLabels.length === 0) {
            // console.log(`ℹ️ [AI_LABELS] No automated labels configured`)
            return []
        }

        // console.log(`📋 [AI_LABELS] Found ${automatedLabels.length} automated labels`)

        const appliedLabels: string[] = []

        // Evaluate each label
        for (const label of automatedLabels) {
            const result = await evaluateLabelCondition(
                label,
                messageText,
                conversationContext
            )

            // Apply label if confidence is high enough
            if (result.shouldApply && result.confidence >= 0.7) {
                await applyLabelToContact(
                    supabase,
                    contactId,
                    result.labelName,
                    result.reason
                )
                appliedLabels.push(result.labelName)
            }
        }

        if (appliedLabels.length > 0) {
            // console.log(`✅ [AI_LABELS] Applied ${appliedLabels.length} labels: ${appliedLabels.join(', ')}`)
        } else {
            // console.log(`ℹ️ [AI_LABELS] No labels applied`)
        }

        return appliedLabels

    } catch (error) {
        console.error(`❌ [AI_LABELS] Error processing AI labels:`, error)
        return []
    }
}

/**
 * Removes a label from a contact
 * @param supabase Supabase client
 * @param contactId Contact ID
 * @param labelName Label name to remove
 */
export async function removeLabelFromContact(
    supabase: SupabaseClient,
    contactId: number,
    labelName: string
): Promise<void> {
    try {
        // Get current labels
        const { data: contact } = await supabase
            .from('contacts')
            .select('labels')
            .eq('id', contactId)
            .single()

        if (!contact) {
            throw new Error('Contact not found')
        }

        const currentLabels = contact.labels || []

        // Remove label
        const updatedLabels = currentLabels.filter((l: string) => l !== labelName)

        // Update contact
        const { error } = await supabase
            .from('contacts')
            .update({ labels: updatedLabels })
            .eq('id', contactId)

        if (error) {
            throw error
        }

        // console.log(`✅ [AI_LABELS] Label "${labelName}" removed from contact ${contactId}`)

    } catch (error) {
        console.error(`❌ [AI_LABELS] Error removing label:`, error)
        throw error
    }
}
