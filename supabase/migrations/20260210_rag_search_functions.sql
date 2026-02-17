-- RAG System: Semantic Search Functions
-- Functions for searching similar messages and products using pgvector

-- Function to search similar messages in chat history
CREATE OR REPLACE FUNCTION search_similar_messages(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5,
    p_user_id uuid DEFAULT NULL,
    p_contact_id text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    content text,
    message_type text,
    created_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ch.id,
        ch.content,
        ch.message_type,
        ch.created_at,
        1 - (ch.embedding <=> query_embedding) AS similarity
    FROM chat_history ch
    WHERE 
        ch.embedding IS NOT NULL
        AND (p_user_id IS NULL OR ch.user_id = p_user_id)
        AND (p_contact_id IS NULL OR ch.contact_id = p_contact_id)
        AND 1 - (ch.embedding <=> query_embedding) > match_threshold
    ORDER BY ch.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to search similar products
CREATE OR REPLACE FUNCTION search_similar_products(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 3,
    p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    product_name text,
    description text,
    price numeric,
    media_url text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.product_name,
        p.description,
        p.price,
        p.media_url,
        1 - (p.description_embedding <=> query_embedding) AS similarity
    FROM products p
    WHERE 
        p.description_embedding IS NOT NULL
        AND (p_user_id IS NULL OR p.user_id = p_user_id)
        AND 1 - (p.description_embedding <=> query_embedding) > match_threshold
    ORDER BY p.description_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_similar_messages TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_products TO authenticated;

-- Create indexes for better performance (if not already exist)
CREATE INDEX IF NOT EXISTS idx_chat_history_embedding ON chat_history USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_embedding ON products USING ivfflat (description_embedding vector_cosine_ops);
