-- ============================================
-- RAG Metrics System
-- Tracks effectiveness, usage, and performance of RAG searches
-- ============================================

-- 1. Create RAG queries log table
CREATE TABLE IF NOT EXISTS public.rag_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id TEXT,
    query_text TEXT NOT NULL,
    query_embedding VECTOR(1536),

    -- Results
    results_count INTEGER DEFAULT 0,
    top_similarity REAL,
    avg_similarity REAL,
    search_method TEXT, -- 'vector', 'fulltext', 'recent', 'hybrid'

    -- Performance
    execution_time_ms INTEGER,
    embedding_cache_hit BOOLEAN DEFAULT false,

    -- Context
    conversation_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create RAG results tracking table
CREATE TABLE IF NOT EXISTS public.rag_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES public.rag_queries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Source info
    source_type TEXT NOT NULL, -- 'faq', 'knowledge_chunk', 'chat_history', 'product'
    source_id UUID, -- Reference to the source (knowledge_embeddings.id, faqs.id, etc)
    content_preview TEXT, -- First 200 chars

    -- Relevance
    similarity_score REAL NOT NULL,
    rank_position INTEGER NOT NULL,

    -- Usage tracking
    was_used_in_response BOOLEAN DEFAULT false,
    user_feedback SMALLINT, -- null, -1 (negative), 0 (neutral), 1 (positive)

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create knowledge usage tracking table
CREATE TABLE IF NOT EXISTS public.knowledge_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- 'faq', 'knowledge_chunk', 'knowledge_doc'
    source_id UUID NOT NULL,

    -- Aggregated metrics
    total_retrievals INTEGER DEFAULT 1,
    total_uses INTEGER DEFAULT 0,
    avg_similarity REAL,
    last_retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one row per source
    UNIQUE(user_id, source_type, source_id)
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_rag_queries_user_created ON public.rag_queries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_queries_contact ON public.rag_queries(contact_id);
CREATE INDEX IF NOT EXISTS idx_rag_results_query ON public.rag_results(query_id);
CREATE INDEX IF NOT EXISTS idx_rag_results_source ON public.rag_results(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_usage_user_type ON public.knowledge_usage(user_id, source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_usage_retrievals ON public.knowledge_usage(total_retrievals DESC);

-- 5. Enable RLS
ALTER TABLE public.rag_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_usage ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Users can view their own RAG queries"
    ON public.rag_queries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own RAG results"
    ON public.rag_results FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own knowledge usage"
    ON public.knowledge_usage FOR SELECT
    USING (auth.uid() = user_id);

-- 7. Create function to log RAG query
CREATE OR REPLACE FUNCTION public.log_rag_query(
    p_user_id UUID,
    p_contact_id TEXT,
    p_query_text TEXT,
    p_query_embedding VECTOR(1536),
    p_results JSONB, -- Array of {source_type, source_id, content_preview, similarity_score}
    p_search_method TEXT,
    p_execution_time_ms INTEGER DEFAULT NULL,
    p_embedding_cache_hit BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query_id UUID;
    v_result JSONB;
    v_rank INTEGER := 1;
    v_top_similarity REAL := 0;
    v_avg_similarity REAL := 0;
    v_results_count INTEGER := 0;
BEGIN
    -- Calculate metrics
    SELECT
        COUNT(*),
        MAX((r->>'similarity_score')::REAL),
        AVG((r->>'similarity_score')::REAL)
    INTO v_results_count, v_top_similarity, v_avg_similarity
    FROM jsonb_array_elements(p_results) r;

    -- Insert query log
    INSERT INTO public.rag_queries (
        user_id,
        contact_id,
        query_text,
        query_embedding,
        results_count,
        top_similarity,
        avg_similarity,
        search_method,
        execution_time_ms,
        embedding_cache_hit
    ) VALUES (
        p_user_id,
        p_contact_id,
        p_query_text,
        p_query_embedding,
        v_results_count,
        v_top_similarity,
        v_avg_similarity,
        p_search_method,
        p_execution_time_ms,
        p_embedding_cache_hit
    ) RETURNING id INTO v_query_id;

    -- Insert each result
    FOR v_result IN SELECT * FROM jsonb_array_elements(p_results)
    LOOP
        INSERT INTO public.rag_results (
            query_id,
            user_id,
            source_type,
            source_id,
            content_preview,
            similarity_score,
            rank_position
        ) VALUES (
            v_query_id,
            p_user_id,
            v_result->>'source_type',
            (v_result->>'source_id')::UUID,
            LEFT(v_result->>'content_preview', 200),
            (v_result->>'similarity_score')::REAL,
            v_rank
        );

        -- Update knowledge usage stats
        INSERT INTO public.knowledge_usage (
            user_id,
            source_type,
            source_id,
            avg_similarity,
            last_retrieved_at
        ) VALUES (
            p_user_id,
            v_result->>'source_type',
            (v_result->>'source_id')::UUID,
            (v_result->>'similarity_score')::REAL,
            NOW()
        )
        ON CONFLICT (user_id, source_type, source_id)
        DO UPDATE SET
            total_retrievals = public.knowledge_usage.total_retrievals + 1,
            avg_similarity = (
                public.knowledge_usage.avg_similarity * public.knowledge_usage.total_retrievals +
                (v_result->>'similarity_score')::REAL
            ) / (public.knowledge_usage.total_retrievals + 1),
            last_retrieved_at = NOW(),
            updated_at = NOW();

        v_rank := v_rank + 1;
    END LOOP;

    RETURN v_query_id;
END;
$$;

-- 8. Create analytics view for easy dashboard consumption
CREATE OR REPLACE VIEW public.rag_analytics AS
SELECT
    user_id,
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_queries,
    AVG(results_count) as avg_results_per_query,
    AVG(top_similarity) as avg_top_similarity,
    AVG(execution_time_ms) as avg_execution_time_ms,
    SUM(CASE WHEN embedding_cache_hit THEN 1 ELSE 0 END)::REAL / COUNT(*) as cache_hit_rate,
    COUNT(DISTINCT contact_id) as unique_contacts
FROM public.rag_queries
GROUP BY user_id, DATE_TRUNC('day', created_at);

-- 9. Create view for top knowledge sources
CREATE OR REPLACE VIEW public.top_knowledge_sources AS
SELECT
    ku.user_id,
    ku.source_type,
    ku.source_id,
    ku.total_retrievals,
    ku.total_uses,
    ku.avg_similarity,
    ku.last_retrieved_at,
    -- Fetch actual content based on source_type
    CASE
        WHEN ku.source_type = 'faq' THEN (
            SELECT f.question
            FROM public.faqs f
            WHERE f.id = ku.source_id
        )
        WHEN ku.source_type = 'knowledge_chunk' THEN (
            SELECT LEFT(kf.extracted_text, 100)
            FROM public.knowledge_files kf
            WHERE kf.id = ku.source_id
        )
    END as content_preview
FROM public.knowledge_usage ku
ORDER BY ku.total_retrievals DESC;

-- 10. Create function to mark result as used
CREATE OR REPLACE FUNCTION public.mark_rag_result_used(
    p_query_id UUID,
    p_source_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.rag_results
    SET was_used_in_response = true
    WHERE query_id = p_query_id
        AND source_id = p_source_id;

    UPDATE public.knowledge_usage
    SET
        total_uses = total_uses + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE source_id = p_source_id;
END;
$$;

-- 11. Grant permissions
GRANT SELECT ON public.rag_queries TO authenticated;
GRANT SELECT ON public.rag_results TO authenticated;
GRANT SELECT ON public.rag_analytics TO authenticated;
GRANT SELECT ON public.top_knowledge_sources TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_rag_query TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.mark_rag_result_used TO authenticated, anon;

-- 12. Add comments
COMMENT ON TABLE public.rag_queries IS 'Logs every RAG query with performance metrics';
COMMENT ON TABLE public.rag_results IS 'Tracks individual results returned by RAG queries';
COMMENT ON TABLE public.knowledge_usage IS 'Aggregated usage statistics per knowledge source';
COMMENT ON VIEW public.rag_analytics IS 'Daily analytics dashboard for RAG performance';
COMMENT ON VIEW public.top_knowledge_sources IS 'Most frequently retrieved knowledge sources';
