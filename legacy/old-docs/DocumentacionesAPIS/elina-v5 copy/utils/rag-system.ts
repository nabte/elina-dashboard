/**
 * RAG System with Semantic Embeddings
 * Retrieval-Augmented Generation for context-aware responses
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'


const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const EMBEDDING_MODEL = 'text-embedding-3-small'
const SIMILARITY_THRESHOLD = 0.7
const MAX_CONTEXT_MESSAGES = 5
const MAX_PRODUCT_RESULTS = 3

export interface RAGContext {
    relevantMessages: Array<{
        content: string
        type: string
        similarity: number
        created_at: string
    }>
    relevantProducts: Array<{
        product_name: string
        description: string
        price: number
        similarity: number
    }>
    contextSummary: string
}

/**
 * Generates embedding for text using OpenAI API with caching
 * @param supabase Supabase client
 * @param text Text to generate embedding for
 * @param userId Optional user ID for tracking
 * @returns Embedding vector
 */
async function generateEmbedding(
    supabase: SupabaseClient,
    text: string,
    userId?: string
): Promise<number[]> {
    try {
        // Generate hash for cache lookup using Web Crypto API
        const encoder = new TextEncoder()
        const textData = encoder.encode(text)
        const hashBuffer = await crypto.subtle.digest('SHA-256', textData)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const textHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')


        // Check cache first
        const { data: cached } = await supabase
            .from('embedding_cache')
            .select('embedding')
            .eq('text_hash', textHash)
            .eq('model', EMBEDDING_MODEL)
            .single()

        if (cached?.embedding) {
            console.log(`✅ [RAG] Using cached embedding`)

            // Update usage stats
            await supabase
                .from('embedding_cache')
                .update({
                    last_used_at: new Date().toISOString(),
                    usage_count: supabase.rpc('increment', { row_id: textHash })
                })
                .eq('text_hash', textHash)

            return cached.embedding
        }

        console.log(`🔄 [RAG] Generating new embedding...`)

        // Generate new embedding
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: EMBEDDING_MODEL,
                input: text
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`OpenAI API error: ${error}`)
        }

        const data = await response.json()
        const embedding = data.data[0].embedding

        // Cache the embedding
        await supabase
            .from('embedding_cache')
            .insert({
                text_hash: textHash,
                text_content: text,
                embedding,
                model: EMBEDDING_MODEL,
                user_id: userId
            })
            .select()

        console.log(`✅ [RAG] Embedding generated and cached`)
        return embedding

    } catch (error) {
        console.error(`❌ [RAG] Error generating embedding:`, error)
        throw error
    }
}

/**
 * Searches for relevant messages in chat history using semantic similarity
 * @param supabase Supabase client
 * @param userId User ID
 * @param contactId Contact ID
 * @param queryEmbedding Query embedding vector
 * @returns Relevant messages
 */
async function searchRelevantMessages(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    queryEmbedding: number[]
): Promise<RAGContext['relevantMessages']> {
    try {
        console.log(`🔍 [RAG] Searching relevant messages...`)

        // Use pgvector similarity search
        const { data: messages, error } = await supabase.rpc('search_similar_messages', {
            query_embedding: queryEmbedding,
            match_threshold: SIMILARITY_THRESHOLD,
            match_count: MAX_CONTEXT_MESSAGES,
            p_user_id: userId,
            p_contact_id: contactId.toString()
        })

        if (error) {
            console.error(`❌ [RAG] Error searching messages:`, error)
            return []
        }

        if (!messages || messages.length === 0) {
            console.log(`ℹ️ [RAG] No relevant messages found`)
            return []
        }

        console.log(`✅ [RAG] Found ${messages.length} relevant messages`)
        return messages.map((msg: any) => ({
            content: msg.content,
            type: msg.message_type,
            similarity: msg.similarity,
            created_at: msg.created_at
        }))

    } catch (error) {
        console.error(`❌ [RAG] Error in message search:`, error)
        return []
    }
}

/**
 * Searches for relevant products using semantic similarity
 * @param supabase Supabase client
 * @param userId User ID
 * @param queryEmbedding Query embedding vector
 * @returns Relevant products
 */
async function searchRelevantProducts(
    supabase: SupabaseClient,
    userId: string,
    queryEmbedding: number[]
): Promise<RAGContext['relevantProducts']> {
    try {
        console.log(`🔍 [RAG] Searching relevant products...`)

        // Use pgvector similarity search on products
        const { data: products, error } = await supabase.rpc('search_similar_products', {
            query_embedding: queryEmbedding,
            match_threshold: SIMILARITY_THRESHOLD,
            match_count: MAX_PRODUCT_RESULTS,
            p_user_id: userId
        })

        if (error) {
            console.error(`❌ [RAG] Error searching products:`, error)
            return []
        }

        if (!products || products.length === 0) {
            console.log(`ℹ️ [RAG] No relevant products found`)
            return []
        }

        console.log(`✅ [RAG] Found ${products.length} relevant products`)
        return products.map((prod: any) => ({
            product_name: prod.product_name,
            description: prod.description,
            price: prod.price,
            similarity: prod.similarity
        }))

    } catch (error) {
        console.error(`❌ [RAG] Error in product search:`, error)
        return []
    }
}

/**
 * Retrieves relevant context for a user message using RAG
 * @param supabase Supabase client
 * @param userId User ID
 * @param contactId Contact ID
 * @param messageText User message text
 * @returns RAG context with relevant messages and products
 */
export async function retrieveContext(
    supabase: SupabaseClient,
    userId: string,
    contactId: number,
    messageText: string
): Promise<RAGContext> {
    try {
        console.log(`\n🧠 [RAG] Retrieving context for message...`)

        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(supabase, messageText, userId)

        // Search in parallel
        const [relevantMessages, relevantProducts] = await Promise.all([
            searchRelevantMessages(supabase, userId, contactId, queryEmbedding),
            searchRelevantProducts(supabase, userId, queryEmbedding)
        ])

        // Build context summary
        let contextSummary = ''

        if (relevantMessages.length > 0) {
            contextSummary += `\n### Conversaciones Relevantes Anteriores:\n`
            relevantMessages.forEach((msg, idx) => {
                contextSummary += `${idx + 1}. [${msg.type}] ${msg.content.substring(0, 150)}...\n`
            })
        }

        if (relevantProducts.length > 0) {
            contextSummary += `\n### Productos Relevantes:\n`
            relevantProducts.forEach((prod, idx) => {
                contextSummary += `${idx + 1}. ${prod.product_name} - $${prod.price}\n   ${prod.description.substring(0, 100)}...\n`
            })
        }

        if (!contextSummary) {
            contextSummary = 'No se encontró contexto relevante previo.'
        }

        console.log(`✅ [RAG] Context retrieved successfully`)
        console.log(`   - Messages: ${relevantMessages.length}`)
        console.log(`   - Products: ${relevantProducts.length}`)

        return {
            relevantMessages,
            relevantProducts,
            contextSummary
        }

    } catch (error) {
        console.error(`❌ [RAG] Error retrieving context:`, error)
        return {
            relevantMessages: [],
            relevantProducts: [],
            contextSummary: 'Error al recuperar contexto.'
        }
    }
}

/**
 * Formats RAG context for inclusion in AI prompt
 * @param context RAG context
 * @returns Formatted context string
 */
export function formatContextForPrompt(context: RAGContext): string {
    if (!context.relevantMessages.length && !context.relevantProducts.length) {
        return ''
    }

    let formattedContext = '\n\n--- CONTEXTO RELEVANTE ---\n'
    formattedContext += context.contextSummary
    formattedContext += '\n--- FIN DEL CONTEXTO ---\n\n'

    return formattedContext
}
