-- ============================================
-- Agregar user_id a embedding_cache para tracking por negocio
-- Permite cache compartido por negocio (user_id) para consultas de productos
-- ============================================

-- 1. Agregar columna user_id opcional a embedding_cache
ALTER TABLE public.embedding_cache 
ADD COLUMN IF NOT EXISTS user_id uuid;

COMMENT ON COLUMN public.embedding_cache.user_id IS 
'ID del usuario/negocio que generó este embedding. Opcional, para tracking y análisis. El cache sigue siendo global por text_hash.';

-- 2. Crear índice para búsqueda eficiente por user_id (útil para análisis y limpieza)
CREATE INDEX IF NOT EXISTS idx_embedding_cache_user_id 
ON public.embedding_cache (user_id) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_embedding_cache_user_id IS 
'Índice para búsqueda eficiente de embeddings por user_id. Útil para análisis y limpieza de cache por negocio.';

