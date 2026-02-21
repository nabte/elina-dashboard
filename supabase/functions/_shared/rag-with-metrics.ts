/**
 * RAG System with Metrics Logging
 * Wraps RAG searches and automatically logs metrics
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface RAGSearchParams {
    supabase: SupabaseClient
    userId: string
    contactId?: string
    queryText: string
    queryEmbedding?: number[]
    matchCount?: number
    matchThreshold?: number
}

export interface RAGResult {
    id: string
    content: string
    similarity: number
    metadata: any
    source_type: string // 'faq', 'knowledge_chunk', 'chat_history', 'product'
}

export interface RAGSearchResult {
    results: RAGResult[]
    queryId: string
    metrics: {
        totalResults: number
        topSimilarity: number
        avgSimilarity: number
        executionTimeMs: number
        searchMethod: string
    }
}

/**
 * Performs RAG search with automatic metrics logging
 */
export async function searchWithMetrics(
    params: RAGSearchParams
): Promise<RAGSearchResult> {
    const startTime = Date.now()
    const {
        supabase,
        userId,
        contactId,
        queryText,
        queryEmbedding,
        matchCount = 5,
        matchThreshold = 0.4
    } = params

    let searchMethod = 'unknown'
    let results: RAGResult[] = []

    try {
        // Determine search method and perform search
        if (queryEmbedding && queryEmbedding.length > 0) {
            searchMethod = 'vector'
            // Vector search on knowledge base
            const { data: knowledgeResults, error: kbError } = await supabase.rpc(
                'search_knowledge_base',
                {
                    query_embedding: queryEmbedding,
                    match_threshold: matchThreshold,
                    match_count: matchCount,
                    p_user_id: userId
                }
            )

            if (!kbError && knowledgeResults && knowledgeResults.length > 0) {
                results = knowledgeResults.map((r: any) => ({
                    id: r.id,
                    content: r.content,
                    similarity: r.similarity,
                    metadata: r.metadata,
                    source_type: r.metadata?.type === 'faq' ? 'faq' : 'knowledge_chunk'
                }))
            } else {
                // Fallback to full-text if vector search fails or returns no results
                searchMethod = 'fulltext'
                const { data: fulltextResults } = await supabase.rpc(
                    'search_faqs',
                    {
                        p_user_id: userId,
                        p_query: queryText,
                        p_match_count: matchCount
                    }
                )

                if (fulltextResults && fulltextResults.length > 0) {
                    results = fulltextResults.map((r: any) => ({
                        id: r.id,
                        content: `${r.question}\n${r.answer}`,
                        similarity: r.relevance,
                        metadata: { category: r.category },
                        source_type: 'faq'
                    }))
                }
            }
        } else {
            // No embedding, use full-text only
            searchMethod = 'fulltext'
            const { data: fulltextResults } = await supabase.rpc(
                'search_faqs',
                {
                    p_user_id: userId,
                    p_query: queryText,
                    p_match_count: matchCount
                }
            )

            if (fulltextResults && fulltextResults.length > 0) {
                results = fulltextResults.map((r: any) => ({
                    id: r.id,
                    content: `${r.question}\n${r.answer}`,
                    similarity: r.relevance,
                    metadata: { category: r.category },
                    source_type: 'faq'
                }))
            }
        }

        const executionTimeMs = Date.now() - startTime

        // Calculate metrics
        const topSimilarity = results.length > 0
            ? Math.max(...results.map(r => r.similarity))
            : 0

        const avgSimilarity = results.length > 0
            ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
            : 0

        // Log metrics
        const resultsForLog = results.map(r => ({
            source_type: r.source_type,
            source_id: r.id,
            content_preview: r.content,
            similarity_score: r.similarity
        }))

        const { data: queryId } = await supabase.rpc('log_rag_query', {
            p_user_id: userId,
            p_contact_id: contactId || null,
            p_query_text: queryText,
            p_query_embedding: queryEmbedding || null,
            p_results: resultsForLog,
            p_search_method: searchMethod,
            p_execution_time_ms: executionTimeMs,
            p_embedding_cache_hit: false // Will be detected by the cache layer
        })

        return {
            results,
            queryId: queryId || 'unknown',
            metrics: {
                totalResults: results.length,
                topSimilarity,
                avgSimilarity,
                executionTimeMs,
                searchMethod
            }
        }

    } catch (error) {
        console.error('[RAG with Metrics] Search error:', error)
        throw error
    }
}

/**
 * Marks a result as used in the response
 */
export async function markResultUsed(
    supabase: SupabaseClient,
    queryId: string,
    sourceId: string
): Promise<void> {
    try {
        await supabase.rpc('mark_rag_result_used', {
            p_query_id: queryId,
            p_source_id: sourceId
        })
    } catch (error) {
        console.error('[RAG with Metrics] Error marking result as used:', error)
    }
}
