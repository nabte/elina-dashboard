-- ============================================
-- Sistema de Búsqueda Híbrida para Productos
-- Full-Text Search + Semantic Search (Embeddings)
-- ============================================

-- 1. Verificar y habilitar extensión pgvector si no existe
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Agregar columna de embeddings a productos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS description_embedding vector(1536);

COMMENT ON COLUMN public.products.description_embedding IS 'Embedding vector de la descripción del producto para búsqueda semántica';

-- 3. Crear índice GIN para búsqueda full-text
-- Nota: No filtramos por is_active ya que ese campo puede no existir en todas las instalaciones
CREATE INDEX IF NOT EXISTS idx_products_fulltext 
ON public.products 
USING GIN(
  to_tsvector('spanish', 
    COALESCE(product_name, '') || ' ' || 
    COALESCE(sku, '') || ' ' || 
    COALESCE(description, '')
  )
);

-- 4. Crear índice IVFFlat para búsqueda vectorial (requiere al menos algunos vectores)
-- Nota: Este índice se creará solo si hay productos con embeddings
-- Se puede crear manualmente después de generar algunos embeddings

-- 5. Función de búsqueda Full-Text
CREATE OR REPLACE FUNCTION public.search_products_fulltext(
  p_user_id uuid,
  p_query text,
  p_limit int DEFAULT 10
)
RETURNS TABLE(
  id bigint,
  product_name text,
  sku text,
  price numeric,
  stock integer,
  description text,
  media_url text,
  relevance_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.product_name,
    p.sku,
    p.price,
    p.stock,
    p.description,
    p.media_url,
    ts_rank(
      to_tsvector('spanish', 
        COALESCE(p.product_name, '') || ' ' || 
        COALESCE(p.sku, '') || ' ' || 
        COALESCE(p.description, '')
      ),
      plainto_tsquery('spanish', p_query)
    )::real AS relevance_score
  FROM public.products p
  WHERE p.user_id = p_user_id
    AND to_tsvector('spanish', 
      COALESCE(p.product_name, '') || ' ' || 
      COALESCE(p.sku, '') || ' ' || 
      COALESCE(p.description, '')
    ) @@ plainto_tsquery('spanish', p_query)
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.search_products_fulltext IS 'Búsqueda full-text de productos usando PostgreSQL tsvector. Retorna productos ordenados por relevancia.';

-- 6. Función de búsqueda Semántica (usando embeddings)
CREATE OR REPLACE FUNCTION public.search_products_semantic(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_limit int DEFAULT 10
)
RETURNS TABLE(
  id bigint,
  product_name text,
  sku text,
  price numeric,
  stock integer,
  description text,
  media_url text,
  similarity_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.product_name,
    p.sku,
    p.price,
    p.stock,
    p.description,
    p.media_url,
    (1 - (p.description_embedding <=> p_query_embedding))::real AS similarity_score
  FROM public.products p
  WHERE p.user_id = p_user_id
    AND p.description_embedding IS NOT NULL
  ORDER BY p.description_embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.search_products_semantic IS 'Búsqueda semántica de productos usando embeddings vectoriales. Retorna productos ordenados por similitud.';

-- 7. Función Híbrida Principal (simplificada para uso desde supabaseTool)
-- Esta función solo hace full-text search. La búsqueda semántica se maneja desde la Edge Function
CREATE OR REPLACE FUNCTION public.search_products_hybrid(
  p_user_id uuid,
  p_query text,
  p_limit int DEFAULT 10
)
RETURNS TABLE(
  id bigint,
  product_name text,
  sku text,
  price numeric,
  stock integer,
  description text,
  media_url text,
  relevance_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Por ahora, solo retornamos resultados de full-text search
  -- La búsqueda semántica se puede agregar después si es necesario
  RETURN QUERY
  SELECT 
    p.id,
    p.product_name,
    p.sku,
    p.price,
    p.stock,
    p.description,
    p.media_url,
    ts_rank(
      to_tsvector('spanish', 
        COALESCE(p.product_name, '') || ' ' || 
        COALESCE(p.sku, '') || ' ' || 
        COALESCE(p.description, '')
      ),
      plainto_tsquery('spanish', p_query)
    )::real AS relevance_score
  FROM public.products p
  WHERE p.user_id = p_user_id
    AND to_tsvector('spanish', 
      COALESCE(p.product_name, '') || ' ' || 
      COALESCE(p.sku, '') || ' ' || 
      COALESCE(p.description, '')
    ) @@ plainto_tsquery('spanish', p_query)
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.search_products_hybrid IS 'Búsqueda híbrida de productos usando full-text search. Retorna productos ordenados por relevancia. Para búsqueda semántica completa, usar la Edge Function search-products-hybrid.';

-- 8. Función helper para extraer códigos de modelos del query
CREATE OR REPLACE FUNCTION public.extract_model_codes(p_query text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_codes text[] := ARRAY[]::text[];
  v_match text;
BEGIN
  -- Extraer códigos de modelos comunes (ej: M477fdw, 414A, HP123, etc.)
  -- Patrón: letras seguidas de números, o números seguidos de letras
  FOR v_match IN 
    SELECT regexp_split_to_table(p_query, '\s+')
  LOOP
    -- Buscar patrones como: M477fdw, 414A, HP123, etc.
    IF v_match ~* '^[A-Z]{1,3}[0-9]+[A-Z]*[0-9]*$' OR 
       v_match ~* '^[0-9]+[A-Z]+[0-9]*$' OR
       v_match ~* '^[A-Z]+-[0-9]+' THEN
      v_codes := array_append(v_codes, upper(trim(v_match)));
    END IF;
  END LOOP;
  
  RETURN v_codes;
END;
$$;

COMMENT ON FUNCTION public.extract_model_codes IS 'Extrae códigos de modelos de impresoras del texto de búsqueda (ej: M477fdw, 414A)';

-- 8. Función para obtener productos por múltiples IDs
CREATE OR REPLACE FUNCTION public.get_products_by_ids(
  p_user_id uuid,
  p_product_ids bigint[]
)
RETURNS TABLE(
  id bigint,
  product_name text,
  sku text,
  price numeric,
  stock integer,
  description text,
  media_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.product_name,
    p.sku,
    p.price,
    p.stock,
    p.description,
    p.media_url
  FROM public.products p
  WHERE p.user_id = p_user_id
    AND p.id = ANY(p_product_ids);
END;
$$;

COMMENT ON FUNCTION public.get_products_by_ids IS 'Obtiene múltiples productos por sus IDs. Usado para reemplazar placeholders múltiples.';

-- 9. Otorgar permisos
REVOKE ALL ON FUNCTION public.search_products_fulltext(uuid, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_products_semantic(uuid, vector, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_products_hybrid(uuid, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.extract_model_codes(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_products_by_ids(uuid, bigint[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_products_fulltext(uuid, text, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_products_semantic(uuid, vector, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_products_hybrid(uuid, text, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.extract_model_codes(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_products_by_ids(uuid, bigint[]) TO authenticated, anon;

