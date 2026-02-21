-- ============================================
-- Funciones de RAG con Fallback a Full-Text Search
-- Sistema resiliente que funciona incluso si embeddings fallan
-- ============================================

-- 1. Función para búsqueda RAG con fallback a full-text
CREATE OR REPLACE FUNCTION public.get_rag_with_fallback(
  p_query_text text,
  p_user_id uuid,
  p_contact_id text,
  p_query_embedding vector(1536) DEFAULT NULL,
  p_match_count int DEFAULT 5,
  p_similarity_threshold real DEFAULT 0.45 -- Updated from 0.7 for better recall
)
RETURNS TABLE(
  id bigint,
  content text,
  message_type text,
  similarity_score real,
  search_method text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_results RECORD;
  v_has_embedding boolean := (p_query_embedding IS NOT NULL);
  v_vector_results_count int := 0;
BEGIN
  -- Paso 1: Intentar búsqueda vectorial si hay embedding
  IF v_has_embedding THEN
    RETURN QUERY
    SELECT 
      ch.id,
      ch.content,
      ch.message_type,
      (1 - (ch.embedding <=> p_query_embedding))::real AS similarity_score,
      'vectorial'::text AS search_method
    FROM public.chat_history AS ch
    WHERE ch.user_id = p_user_id 
      AND ch.contact_id = p_contact_id
      AND ch.embedding IS NOT NULL
      AND (1 - (ch.embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY ch.embedding <=> p_query_embedding
    LIMIT p_match_count;
    
    GET DIAGNOSTICS v_vector_results_count = ROW_COUNT;
  END IF;
  
  -- Paso 2: Si no hay suficientes resultados vectoriales, usar full-text search
  IF v_vector_results_count < p_match_count THEN
    RETURN QUERY
    SELECT 
      ch.id,
      ch.content,
      ch.message_type,
      ts_rank(
        to_tsvector('spanish', COALESCE(ch.content, '')),
        plainto_tsquery('spanish', p_query_text)
      )::real AS similarity_score,
      'fulltext'::text AS search_method
    FROM public.chat_history AS ch
    WHERE ch.user_id = p_user_id 
      AND ch.contact_id = p_contact_id
      AND to_tsvector('spanish', COALESCE(ch.content, '')) @@ plainto_tsquery('spanish', p_query_text)
      -- Excluir resultados que ya se obtuvieron por búsqueda vectorial
      AND (NOT v_has_embedding OR ch.id NOT IN (
        SELECT id FROM public.chat_history 
        WHERE user_id = p_user_id 
          AND contact_id = p_contact_id
          AND embedding IS NOT NULL
          AND (1 - (embedding <=> p_query_embedding)) >= p_similarity_threshold
        ORDER BY embedding <=> p_query_embedding
        LIMIT p_match_count
      ))
    ORDER BY similarity_score DESC
    LIMIT (p_match_count - v_vector_results_count);
  END IF;
  
  -- Si no hay resultados de ninguna búsqueda, retornar mensajes recientes como fallback
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      ch.id,
      ch.content,
      ch.message_type,
      0.5::real AS similarity_score, -- Score neutral para mensajes recientes
      'recent'::text AS search_method
    FROM public.chat_history AS ch
    WHERE ch.user_id = p_user_id 
      AND ch.contact_id = p_contact_id
    ORDER BY ch.created_at DESC
    LIMIT p_match_count;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_rag_with_fallback IS 
'Búsqueda RAG inteligente con fallback: primero intenta búsqueda vectorial, luego full-text, y finalmente mensajes recientes.';

-- 2. Función simplificada que solo usa full-text (fallback cuando embedding no está disponible)
CREATE OR REPLACE FUNCTION public.get_rag_fulltext_only(
  p_query_text text,
  p_user_id uuid,
  p_contact_id text,
  p_match_count int DEFAULT 5
)
RETURNS TABLE(
  id bigint,
  content text,
  message_type text,
  relevance_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ch.id,
    ch.content,
    ch.message_type,
    ts_rank(
      to_tsvector('spanish', COALESCE(ch.content, '')),
      plainto_tsquery('spanish', p_query_text)
    )::real AS relevance_score
  FROM public.chat_history AS ch
  WHERE ch.user_id = p_user_id 
    AND ch.contact_id = p_contact_id
    AND to_tsvector('spanish', COALESCE(ch.content, '')) @@ plainto_tsquery('spanish', p_query_text)
  ORDER BY relevance_score DESC
  LIMIT p_match_count;
  
  -- Si no hay resultados, retornar mensajes recientes
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      ch.id,
      ch.content,
      ch.message_type,
      0.5::real AS relevance_score
    FROM public.chat_history AS ch
    WHERE ch.user_id = p_user_id 
      AND ch.contact_id = p_contact_id
    ORDER BY ch.created_at DESC
    LIMIT p_match_count;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_rag_fulltext_only IS 
'Búsqueda RAG usando solo full-text search. Útil como fallback cuando embeddings no están disponibles.';

-- 3. Permisos
GRANT EXECUTE ON FUNCTION public.get_rag_with_fallback(text, uuid, text, vector, int, real) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_rag_fulltext_only(text, uuid, text, int) TO authenticated, anon;

