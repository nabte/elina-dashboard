
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function getRagContext(
    supabase: SupabaseClient,
    userId: string,
    contactId: string,
    text: string
): Promise<string> {
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

    // 2. Search Context (RAG with Fallback)
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
        if (!results || results.length === 0) return ""

        // Format Context
        return results.map((r: any) => {
            return `[Contexto IA]: ${r.content}`
        }).join("\n\n")

    } catch (e) {
        console.error("Error in RAG search:", e)
        return ""
    }
}
