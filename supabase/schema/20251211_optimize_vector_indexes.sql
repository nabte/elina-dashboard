-- ============================================
-- Optimización de Índices Vectoriales para RAG
-- Mejora significativa en velocidad de búsqueda
-- ============================================

-- 1. Crear índice HNSW en chat_history.embedding para búsqueda vectorial rápida
-- HNSW es mejor que IVFFlat para búsquedas exactas y consultas frecuentes
DO $$
BEGIN
  -- Verificar si el índice ya existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'chat_history' 
      AND indexname = 'idx_chat_history_embedding_hnsw'
  ) THEN
    -- Crear índice HNSW solo si hay embeddings (requiere al menos algunos vectores)
    -- Usamos m=16, ef_construction=64 (valores recomendados para balance velocidad/precisión)
    EXECUTE 'CREATE INDEX idx_chat_history_embedding_hnsw 
             ON public.chat_history 
             USING hnsw (embedding vector_cosine_ops)
             WITH (m = 16, ef_construction = 64)';
    
    RAISE NOTICE 'Índice HNSW creado en chat_history.embedding';
  ELSE
    RAISE NOTICE 'Índice HNSW ya existe en chat_history.embedding';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'No se pudo crear índice HNSW (puede ser que no haya embeddings aún): %', SQLERRM;
END $$;

-- 2. Crear índice compuesto optimizado para match_chat_history
-- Este índice mejora la búsqueda cuando se filtra por user_id y contact_id
CREATE INDEX IF NOT EXISTS idx_chat_history_user_contact_embedding 
ON public.chat_history (user_id, contact_id) 
WHERE embedding IS NOT NULL;

COMMENT ON INDEX idx_chat_history_user_contact_embedding IS 
'Índice compuesto optimizado para match_chat_history. Filtra por user_id y contact_id antes de buscar por embedding.';

-- 3. Crear índice HNSW en embedding_cache.embedding para búsqueda de similitud
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'embedding_cache' 
      AND indexname = 'idx_embedding_cache_embedding_hnsw'
  ) THEN
    EXECUTE 'CREATE INDEX idx_embedding_cache_embedding_hnsw 
             ON public.embedding_cache 
             USING hnsw (embedding vector_cosine_ops)
             WITH (m = 16, ef_construction = 64)';
    
    RAISE NOTICE 'Índice HNSW creado en embedding_cache.embedding';
  ELSE
    RAISE NOTICE 'Índice HNSW ya existe en embedding_cache.embedding';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'No se pudo crear índice HNSW en embedding_cache: %', SQLERRM;
END $$;

-- 4. Optimizar índice GIN existente para full-text search en chat_history
-- Verificar si existe y mejorarlo si es necesario
DO $$
BEGIN
  -- Si no existe índice GIN en content, crearlo
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'chat_history' 
      AND indexname = 'idx_chat_history_content_gin'
  ) THEN
    CREATE INDEX idx_chat_history_content_gin 
    ON public.chat_history 
    USING GIN (to_tsvector('spanish', COALESCE(content, '')));
    
    RAISE NOTICE 'Índice GIN creado en chat_history.content';
  ELSE
    RAISE NOTICE 'Índice GIN ya existe en chat_history.content';
  END IF;
END $$;

-- 5. Índice adicional para búsqueda por user_id y created_at (útil para RAG reciente)
CREATE INDEX IF NOT EXISTS idx_chat_history_user_created 
ON public.chat_history (user_id, created_at DESC) 
WHERE embedding IS NOT NULL;

COMMENT ON INDEX idx_chat_history_user_created IS 
'Índice para búsqueda rápida de mensajes recientes con embeddings por usuario.';

-- 6. Actualizar estadísticas de índices para optimización del query planner
ANALYZE public.chat_history;
ANALYZE public.embedding_cache;

-- Comentarios finales
COMMENT ON INDEX idx_chat_history_embedding_hnsw IS 
'Índice HNSW para búsqueda vectorial rápida en chat_history. Usa cosine similarity.';
COMMENT ON INDEX idx_embedding_cache_embedding_hnsw IS 
'Índice HNSW para búsqueda de similitud semántica en embedding_cache.';

