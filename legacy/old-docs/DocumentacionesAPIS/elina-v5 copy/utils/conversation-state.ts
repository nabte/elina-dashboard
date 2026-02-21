import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type {
    ConversationContextState,
    MentionedProduct,
    CartItem
} from '../config/types.ts'

/**
 * Loads conversation state for a contact
 */
export async function loadConversationState(
    supabase: SupabaseClient,
    contactId: string
): Promise<ConversationContextState | null> {
    try {
        const { data, error } = await supabase
            .from('conversation_contexts') // Changed from conversation_states
            .select('state')
            .eq('contact_id', contactId)
            .single()

        if (error || !data) {
            return null
        }

        const state = typeof data.state === 'string'
            ? JSON.parse(data.state)
            : data.state

        // Check if state is stale (older than 24 hours)
        const updatedAt = new Date(state.updatedAt)
        const hoursSince = (Date.now() - updatedAt.getTime()) / 3600000

        if (hoursSince > 24) {
            console.log(`⏰ [STATE] Conversation state is stale (${hoursSince.toFixed(1)}h old), ignoring`)
            return null
        }

        console.log(`✅ [STATE] Loaded conversation state: ${state.lastProductsMentioned?.length || 0} products mentioned`)
        return state

    } catch (error) {
        console.error(`❌ [STATE] Error loading conversation state:`, error)
        return null
    }
}

/**
 * Saves conversation state for a contact
 */
export async function saveConversationState(
    supabase: SupabaseClient,
    contactId: string,
    state: Partial<ConversationContextState>
): Promise<void> {
    try {
        // Load existing state and merge
        const existing = await loadConversationState(supabase, contactId)
        const merged: ConversationContextState = {
            lastProductsMentioned: state.lastProductsMentioned || existing?.lastProductsMentioned || [],
            tentativeCart: state.tentativeCart || existing?.tentativeCart || [],
            lastIntent: state.lastIntent || existing?.lastIntent || 'unknown',
            lastAgentResponse: state.lastAgentResponse || existing?.lastAgentResponse,
            appointmentContext: state.appointmentContext || existing?.appointmentContext,
            potentialService: state.potentialService || existing?.potentialService,
            updatedAt: new Date().toISOString()
        }

        await supabase.from('conversation_contexts').upsert({ // Changed from conversation_states
            contact_id: contactId,
            state: merged,
            updated_at: merged.updatedAt
        })

        console.log(`✅ [STATE] Saved conversation state for contact ${contactId}`)

    } catch (error) {
        console.error(`❌ [STATE] Error saving conversation state:`, error)
    }
}

/**
 * Detects contextual references in user message
 * Examples: "el primero", "el segundo", "ese", "esa"
 */
export function detectContextualReference(message: string): {
    hasReference: boolean
    position?: number
    type: 'positional' | 'demonstrative' | 'none'
} {
    const lowerMessage = message.toLowerCase()

    // Positional references: "el primero", "el segundo", "la tercera"
    const positionalPatterns = [
        { pattern: /\b(el|la)\s+primer[oa]?\b/i, position: 1 },
        { pattern: /\b(el|la)\s+segund[oa]?\b/i, position: 2 },
        { pattern: /\b(el|la)\s+tercer[oa]?\b/i, position: 3 },
        { pattern: /\b(el|la)\s+cuart[oa]?\b/i, position: 4 },
        { pattern: /\b(el|la)\s+quint[oa]?\b/i, position: 5 }
    ]

    for (const { pattern, position } of positionalPatterns) {
        if (pattern.test(lowerMessage)) {
            return { hasReference: true, position, type: 'positional' }
        }
    }

    // Demonstrative references: "ese", "esa", "esos", "aquel"
    if (/\b(ese|esa|esos|esas|aquel|aquella|aquellos|aquellas)\b/i.test(lowerMessage)) {
        // Assume they mean the last one mentioned (position 1)
        return { hasReference: true, position: 1, type: 'demonstrative' }
    }

    return { hasReference: false, type: 'none' }
}

/**
 * Resolves a contextual reference to a product ID
 */
export function resolveReference(
    reference: ReturnType<typeof detectContextualReference>,
    state: ConversationContextState | null
): number | null {
    if (!reference.hasReference || !state || !state.lastProductsMentioned.length) {
        return null
    }

    const product = state.lastProductsMentioned.find(p => p.position === reference.position)
    return product?.id || null
}

/**
 * Extracts product IDs from agent response (for tracking what was shown)
 */
export function extractMentionedProducts(
    responseText: string,
    productMap: Record<string, any>
): MentionedProduct[] {
    const mentioned: MentionedProduct[] = []
    const productIdRegex = /\[PRODUCT_(?:CARD|NAME|PRICE|MEDIA):(\d+)\]/g
    const foundIds = new Set<number>()

    let match
    let position = 1
    while ((match = productIdRegex.exec(responseText)) !== null) {
        const id = parseInt(match[1], 10)
        if (!foundIds.has(id) && productMap[id]) {
            foundIds.add(id)
            mentioned.push({
                id,
                position: position++,
                name: productMap[id].productName,
                price: productMap[id].price,
                mentionedAt: new Date().toISOString()
            })
        }
    }

    return mentioned
}
