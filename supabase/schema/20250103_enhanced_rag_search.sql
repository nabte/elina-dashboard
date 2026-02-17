-- Function: get_current_prompt_version
-- Gets the latest version number for a user's prompt
CREATE OR REPLACE FUNCTION get_current_prompt_version(p_user_id UUID)
RETURNS TABLE (version_number INTEGER, created_at TIMESTAMP WITH TIME ZONE) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT pv.version_number, pv.created_at
    FROM prompt_versions pv
    WHERE pv.user_id = p_user_id
    ORDER BY pv.version_number DESC
    LIMIT 1;
END;
$$;

-- Function: get_rag_with_training_examples
-- Enhanced RAG search that prioritizes training examples
CREATE OR REPLACE FUNCTION get_rag_with_training_examples(
  p_query_text TEXT,
  p_user_id UUID,
  p_contact_id TEXT,
  p_query_embedding VECTOR(1536),
  p_match_count INT DEFAULT 5,
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_include_simulations BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id BIGINT, -- Using BIGINT to accommodate UUIDs cast to int or fake IDs
  content TEXT,
  message_type TEXT,
  similarity_score FLOAT,
  search_method TEXT,
  source_type TEXT -- 'training_example' or 'chat_history'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_example_match_count INT := 3; -- Prioritize top 3 examples
  v_history_match_count INT := p_match_count - v_example_match_count;
BEGIN
  IF v_history_match_count < 2 THEN
    v_history_match_count := 2; -- Ensure at least some history
  END IF;

  RETURN QUERY
  WITH training_matches AS (
    SELECT 
      -- Generate a pseudo-ID for training examples (needs to be distinct from chat_history ids which are usually bigint)
      -- doing a hash or just a negative number if possible, but here we cast UUID to something or just use row_number
      (ROW_NUMBER() OVER (ORDER BY (te.embedding <=> p_query_embedding) ASC)) * -1 as id, -- Negative IDs for examples
      ('User: ' || te.user_message || E'\nAI: ' || te.ai_response) as content,
      'text'::text as message_type,
      (1 - (te.embedding <=> p_query_embedding))::float as similarity_score,
      'vector_training'::text as search_method,
      'training_example'::text as source_type
    FROM training_examples te
    WHERE te.user_id = p_user_id
      AND te.is_good_example = true
      AND (1 - (te.embedding <=> p_query_embedding)) > p_similarity_threshold
    ORDER BY te.embedding <=> p_query_embedding ASC
    LIMIT v_example_match_count
  ),
  history_matches AS (
    SELECT 
      ch.id,
      ch.message as content,
      ch.message_type,
      (1 - (ch.embedding <=> p_query_embedding))::float as similarity_score,
      'vector_history'::text as search_method,
      'chat_history'::text as source_type
    FROM chat_history ch
    WHERE ch.user_id = p_user_id
      AND (ch.contact_id = p_contact_id OR p_contact_id IS NULL) -- Modified to allow loose contact matching if needed
      AND (p_include_simulations OR (ch.is_simulation IS NOT TRUE)) -- Filter simulations if requested
      AND (1 - (ch.embedding <=> p_query_embedding)) > p_similarity_threshold
    ORDER BY ch.embedding <=> p_query_embedding ASC
    LIMIT p_match_count
  )
  SELECT * FROM training_matches
  UNION ALL
  SELECT * FROM history_matches
  -- Filter out history matches that are already covered by training examples (if we had a way to link them)
  -- For now just return both sets, sorted by similarity
  ORDER BY similarity_score DESC
  LIMIT p_match_count;
END;
$$;
