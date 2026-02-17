
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function getRagContext(
    supabase: SupabaseClient,
    userId: string,
    contactId: string,
    text: string
): Promise<string> {
    // Early exit for simple messages (optimization)
    const simplePatterns = /^(hola|hi|hey|buenos días|buenas tardes|buenas noches|gracias|ok|sí|si|no|perfecto|entendido)$/i
    if (simplePatterns.test(text.trim())) {
        console.log('[RAG] Mensaje simple detectado, skipping RAG')
        return ""
    }

    // 1. Get Embedding (Smart Router)
    const embeddingUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/smart-embedding-router`

    let embedding = null
    let needsRag = true

    try {
        const embedRes = await fetch(embeddingUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                skip_rag: false
            }),
        })

        if (embedRes.ok) {
            const embedData = await embedRes.json()
            embedding = embedData.embedding
            needsRag = embedData.needs_rag
        } else {
            console.warn('Embedding fetch failed, falling back to full-text only')
        }
    } catch (e) {
        console.error('Error fetching embedding:', e)
    }

    if (!needsRag) return ""


    // 2. Search User's Knowledge Files (Business Documentation)
    let knowledgeContext = ""
    if (embedding) {
        try {
            const { data: knowledgeChunks, error: knowledgeError } = await supabase.rpc('match_knowledge_embeddings', {
                query_embedding: embedding,
                match_threshold: 0.75,
                match_count: 3
            })

            if (!knowledgeError && knowledgeChunks && knowledgeChunks.length > 0) {
                knowledgeContext = "\n\n📚 CONOCIMIENTO DEL NEGOCIO (Documentos subidos):\n" +
                    knowledgeChunks.map((chunk: any) =>
                        `- ${chunk.content} (Fuente: ${chunk.file_name})`
                    ).join('\n')

                console.log(`[RAG] Found ${knowledgeChunks.length} knowledge chunks`)
            }
        } catch (e) {
            console.error('[RAG] Knowledge search error:', e)
        }
    }


    // 3. Search Context (RAG with Fallback - Conversation History)
    const ragUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/rag-with-fallback`
    try {
        const ragRes = await fetch(ragUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query_text: text,
                user_id: userId,
                contact_id: contactId,
                query_embedding: (embedding && embedding.length > 0) ? embedding : null,
                match_count: 5
            })
        })

        if (!ragRes.ok) {
            console.error('RAG Search failed:', await ragRes.text())
            return ""
        }

        const results = await ragRes.json()
        if (!results || results.length === 0) {
            // If no RAG results, but we have knowledge context, return that.
            // Otherwise, return empty.
            return knowledgeContext || ""
        }

        // Build final context
        let finalContext = ""

        // Assuming 'results' from rag-with-fallback might contain different types of results
        // For now, we'll treat them all as general RAG context.
        if (results.length > 0) {
            finalContext += results.map((r: any) => `[Contexto IA]: ${r.content}`).join('\n\n')
        }

        // Append knowledge context from uploaded documents
        if (knowledgeContext) {
            if (finalContext) finalContext += '\n\n' // Add separator if there's existing context
            finalContext += knowledgeContext
        }

        return finalContext

    } catch (e) {
        console.error("Error in RAG search:", e)
        return ""
    }
}

export async function detectObjections(
    supabase: SupabaseClient,
    userId: string,
    messageText: string
): Promise<{ objection: string, response: string, confidence: number }[]> {
    // 1. Get active context and objections
    const { data: salesContext, error } = await supabase
        .from('sales_prompts')
        .select('prompt')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error || !salesContext || !salesContext.prompt || !salesContext.prompt.detected_objections) {
        return []
    }

    const objections = salesContext.prompt.detected_objections.map((obj: any) => ({
        objection_text: obj.objection,
        suggested_response: obj.response
    }))

    if (objections.length === 0) {
        return []
    }

    // 2. Get embedding for user message
    const embeddingUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/smart-embedding-router`

    try {
        const embedRes = await fetch(embeddingUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: messageText,
                skip_rag: false
            }),
        })

        if (!embedRes.ok) {
            console.warn('Embedding fetch failed for objections, using keyword matching')
            return keywordMatchObjections(messageText, objections)
        }

        const embedData = await embedRes.json()
        const messageEmbedding = embedData.embedding

        if (!messageEmbedding) {
            return keywordMatchObjections(messageText, objections)
        }

        // 3. Calculate similarity for each objection
        const matches: { objection: string, response: string, confidence: number }[] = []

        for (const obj of objections) {
            // Get embedding for objection text
            const objEmbedRes = await fetch(embeddingUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: obj.objection_text,
                    skip_rag: true
                }),
            })

            if (objEmbedRes.ok) {
                const objEmbedData = await objEmbedRes.json()
                const objectionEmbedding = objEmbedData.embedding

                if (objectionEmbedding) {
                    // Calculate cosine similarity
                    const similarity = cosineSimilarity(messageEmbedding, objectionEmbedding)

                    // Only include if similarity > 0.7 (70% match)
                    if (similarity > 0.7) {
                        matches.push({
                            objection: obj.objection_text,
                            response: obj.suggested_response,
                            confidence: similarity
                        })
                    }
                }
            }
        }

        // Sort by confidence (highest first)
        matches.sort((a, b) => b.confidence - a.confidence)

        return matches.slice(0, 3) // Return top 3 matches

    } catch (e) {
        console.error('Error in objection detection:', e)
        return keywordMatchObjections(messageText, objections)
    }
}

// Fallback: Simple keyword matching
function keywordMatchObjections(messageText: string, objections: any[]): { objection: string, response: string, confidence: number }[] {
    const lowerMessage = messageText.toLowerCase()
    const matches: { objection: string, response: string, confidence: number }[] = []

    for (const obj of objections) {
        const lowerObjection = obj.objection_text.toLowerCase()

        // Check if message contains objection keywords
        const keywords = lowerObjection.split(' ').filter((w: string) => w.length > 3)
        const matchCount = keywords.filter((k: string) => lowerMessage.includes(k)).length

        if (matchCount > 0) {
            const confidence = matchCount / keywords.length
            if (confidence > 0.5) {
                matches.push({
                    objection: obj.objection_text,
                    response: obj.suggested_response,
                    confidence: confidence
                })
            }
        }
    }

    matches.sort((a, b) => b.confidence - a.confidence)
    return matches.slice(0, 3)
}

// Cosine similarity calculation
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    return denominator === 0 ? 0 : dotProduct / denominator
}
