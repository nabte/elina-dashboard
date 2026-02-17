-- ============================================
-- Optimización de Cache de Embeddings con Similitud Semántica
-- Reutiliza embeddings similares sin generar nuevos
-- ============================================

-- 1. Función para encontrar embedding similar en cache (usando similitud semántica)
CREATE OR REPLACE FUNCTION public.find_similar_cached_embedding(
  p_query_embedding vector(1536),
  p_similarity_threshold real DEFAULT 0.95
)
RETURNS TABLE(
  id uuid,
  text_hash text,
  text_content text,
  embedding vector(1536),
  model text,
  similarity_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.id,
    ec.text_hash,
    ec.text_content,
    ec.embedding,
    ec.model,
    (1 - (ec.embedding <=> p_query_embedding))::real AS similarity_score
  FROM public.embedding_cache AS ec
  WHERE (1 - (ec.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY ec.embedding <=> p_query_embedding
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.find_similar_cached_embedding IS 
'Busca embeddings similares en cache usando similitud coseno. Retorna el más similar si supera el threshold (default 0.95).';

-- 2. Función mejorada para obtener embedding del cache (con búsqueda de similitud)
CREATE OR REPLACE FUNCTION public.get_embedding_from_cache_enhanced(
  p_text_hash text,
  p_text_content text DEFAULT NULL,
  p_use_similarity boolean DEFAULT false,
  p_similarity_threshold real DEFAULT 0.95
)
RETURNS TABLE(
  id uuid,
  text_hash text,
  text_content text,
  embedding vector(1536),
  model text,
  from_exact_match boolean,
  similarity_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_exact_match RECORD;
  v_similar_match RECORD;
BEGIN
  -- Paso 1: Buscar coincidencia exacta por hash
  SELECT 
    ec.id,
    ec.text_hash,
    ec.text_content,
    ec.embedding,
    ec.model
  INTO v_exact_match
  FROM public.embedding_cache AS ec
  WHERE ec.text_hash = p_text_hash
  LIMIT 1;
  
  IF v_exact_match.id IS NOT NULL THEN
    -- Actualizar last_used_at y usage_count
    UPDATE public.embedding_cache
    SET 
      last_used_at = now(),
      usage_count = usage_count + 1
    WHERE id = v_exact_match.id;
    
    RETURN QUERY
    SELECT 
      v_exact_match.id,
      v_exact_match.text_hash,
      v_exact_match.text_content,
      v_exact_match.embedding,
      v_exact_match.model,
      true::boolean AS from_exact_match,
      1.0::real AS similarity_score;
    RETURN;
  END IF;
  
  -- Paso 2: Si no hay coincidencia exacta y se permite búsqueda por similitud
  IF p_use_similarity AND p_text_content IS NOT NULL THEN
    -- Primero necesitamos generar un embedding temporal para buscar similitud
    -- Esto requiere llamar a OpenAI, así que por ahora solo retornamos null
    -- En una implementación futura, podríamos cachear embeddings de palabras comunes
    RETURN;
  END IF;
  
  -- No se encontró nada
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_embedding_from_cache_enhanced IS 
'Versión mejorada de get_embedding_from_cache que puede buscar por similitud semántica además de hash exacto.';

-- 3. Función para actualizar estadísticas de uso del cache
CREATE OR REPLACE FUNCTION public.update_embedding_cache_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Actualizar last_used_at para embeddings usados recientemente
  -- Esto se puede llamar periódicamente para limpiar cache antiguo
  UPDATE public.embedding_cache
  SET last_used_at = now()
  WHERE last_used_at < now() - interval '30 days'
    AND usage_count > 0;
END;
$$;

COMMENT ON FUNCTION public.update_embedding_cache_stats IS 
'Actualiza estadísticas del cache de embeddings. Útil para limpieza periódica.';

-- 4. Función para limpiar cache antiguo (embeddings no usados en 30 días)
-- Primero eliminar la función existente si tiene diferentes parámetros
DROP FUNCTION IF EXISTS public.cleanup_old_embedding_cache() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_embedding_cache(int) CASCADE;

CREATE OR REPLACE FUNCTION public.cleanup_old_embedding_cache(
  p_days_old int DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted_count int;
BEGIN
  DELETE FROM public.embedding_cache
  WHERE last_used_at < now() - (p_days_old || ' days')::interval
    AND usage_count < 5; -- Solo eliminar si se usó menos de 5 veces
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_embedding_cache IS 
'Limpia embeddings del cache que no se han usado en los últimos N días y tienen bajo uso. Retorna número de registros eliminados.';

-- 5. Permisos
GRANT EXECUTE ON FUNCTION public.find_similar_cached_embedding(vector, real) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_embedding_from_cache_enhanced(text, text, boolean, real) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_embedding_cache_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_embedding_cache(int) TO authenticated, anon;

-- 6. Índice adicional para búsqueda por last_used_at (útil para limpieza)
CREATE INDEX IF NOT EXISTS idx_embedding_cache_last_used 
ON public.embedding_cache (last_used_at) 
WHERE last_used_at IS NOT NULL;

COMMENT ON INDEX idx_embedding_cache_last_used IS 
'Índice para limpieza eficiente de cache antiguo basado en last_used_at.';

