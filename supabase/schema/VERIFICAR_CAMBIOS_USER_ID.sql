-- ============================================
-- Script de Verificación: Cambios user_id en embedding_cache
-- Ejecutar en Supabase SQL Editor para verificar que todo esté aplicado
-- ============================================

-- 1. Verificar que la columna user_id existe en embedding_cache
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'embedding_cache'
  AND column_name = 'user_id';

-- Si no devuelve resultados, la columna NO existe (necesitas ejecutar la migración)

-- 2. Verificar que el índice existe
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'embedding_cache'
  AND indexname = 'idx_embedding_cache_user_id';

-- Si no devuelve resultados, el índice NO existe (necesitas ejecutar la migración)

-- 3. Verificar estructura completa de embedding_cache (para referencia)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'embedding_cache'
ORDER BY ordinal_position;

-- 4. Verificar si hay datos con user_id (debería estar vacío o tener algunos si ya se usó)
SELECT 
    COUNT(*) as total_registros,
    COUNT(user_id) as registros_con_user_id,
    COUNT(*) - COUNT(user_id) as registros_sin_user_id
FROM public.embedding_cache;

-- 5. Verificar comentarios de la columna (opcional, para confirmar que se aplicó todo)
SELECT 
    obj_description(c.oid, 'pg_class') as table_comment,
    col_description(c.oid, a.attnum) as column_comment
FROM pg_class c
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE c.relname = 'embedding_cache'
  AND a.attname = 'user_id'
  AND a.attnum > 0
  AND NOT a.attisdropped;

-- ============================================
-- RESUMEN: 
-- Si todas las queries devuelven resultados, los cambios están aplicados ✅
-- Si alguna no devuelve resultados, necesitas ejecutar la migración ❌
-- ============================================

