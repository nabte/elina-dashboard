-- ============================================
-- Separate FAQs into Dedicated Table
-- Migrates FAQs from knowledge_files to new faqs table
-- ============================================

-- 1. Create FAQs table
CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    source TEXT DEFAULT 'manual', -- 'manual', 'auto_generated', 'csv_import'
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('spanish', COALESCE(question, '')), 'A') ||
        setweight(to_tsvector('spanish', COALESCE(answer, '')), 'B')
    ) STORED
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_faqs_user_id ON public.faqs(user_id);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON public.faqs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_faqs_search_vector ON public.faqs USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_created_at ON public.faqs(created_at DESC);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view their own FAQs"
    ON public.faqs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FAQs"
    ON public.faqs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FAQs"
    ON public.faqs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FAQs"
    ON public.faqs FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faqs_updated_at_trigger
    BEFORE UPDATE ON public.faqs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_faqs_updated_at();

-- 6. Migrate existing FAQs from knowledge_files
DO $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    -- Insert FAQs from knowledge_files into new faqs table
    INSERT INTO public.faqs (
        user_id,
        question,
        answer,
        source,
        created_at
    )
    SELECT
        kf.user_id,
        -- Extract question from "P: question" format
        TRIM(REGEXP_REPLACE(
            SUBSTRING(kf.extracted_text FROM '^P: (.+?)\n'),
            '^P:\s*',
            ''
        )),
        -- Extract answer from "R: answer" format
        TRIM(REGEXP_REPLACE(
            SUBSTRING(kf.extracted_text FROM '\nR: (.+)$'),
            '^R:\s*',
            ''
        )),
        -- Determine source from filename
        CASE
            WHEN kf.filename LIKE 'faq_import%' THEN 'csv_import'
            WHEN kf.filename LIKE 'faq_manual%' THEN 'manual'
            ELSE 'auto_generated'
        END,
        kf.created_at
    FROM public.knowledge_files kf
    WHERE kf.filename LIKE 'faq_%'
        AND kf.extracted_text ~ '^P:.+\nR:.+'
        -- Avoid duplicates (check if question already exists for this user)
        AND NOT EXISTS (
            SELECT 1 FROM public.faqs f
            WHERE f.user_id = kf.user_id
                AND f.question = TRIM(REGEXP_REPLACE(
                    SUBSTRING(kf.extracted_text FROM '^P: (.+?)\n'),
                    '^P:\s*',
                    ''
                ))
        );

    GET DIAGNOSTICS migrated_count = ROW_COUNT;

    RAISE NOTICE 'Migrated % FAQs from knowledge_files to faqs table', migrated_count;

    -- Note: We keep the original knowledge_files entries for now
    -- They will still work for RAG via embeddings
    -- You can delete them later if needed with:
    -- DELETE FROM public.knowledge_files WHERE filename LIKE 'faq_%';
END $$;

-- 7. Create helper function to get FAQs with full-text search
CREATE OR REPLACE FUNCTION public.search_faqs(
    p_user_id UUID,
    p_query TEXT,
    p_match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    question TEXT,
    answer TEXT,
    category TEXT,
    relevance REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id,
        f.question,
        f.answer,
        f.category,
        ts_rank(f.search_vector, plainto_tsquery('spanish', p_query))::REAL as relevance
    FROM public.faqs f
    WHERE f.user_id = p_user_id
        AND f.is_active = true
        AND f.search_vector @@ plainto_tsquery('spanish', p_query)
    ORDER BY relevance DESC
    LIMIT p_match_count;
END;
$$;

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_faqs(UUID, TEXT, INT) TO authenticated;

-- 9. Add comment
COMMENT ON TABLE public.faqs IS 'Dedicated FAQs table separated from knowledge_files. Includes full-text search and usage tracking.';
