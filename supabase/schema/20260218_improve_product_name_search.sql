-- ============================================
-- Mejorar búsqueda de productos con nombres alternativos separados por "/"
-- ============================================
--
-- Problema: Productos como "85A/35A/36A" no se encuentran al buscar "85A"
-- Solución: Normalizar "/" como separador de palabras en el índice y búsqueda
--

-- 1. Eliminar índice anterior
DROP INDEX IF EXISTS public.idx_products_fulltext;

-- 2. Crear nuevo índice GIN que reemplaza "/" con espacios
-- Esto permite que "85A/35A/36A" se tokenice como "85A 35A 36A"
CREATE INDEX idx_products_fulltext
ON public.products
USING GIN(
  to_tsvector('spanish',
    COALESCE(replace(product_name, '/', ' '), '') || ' ' ||
    COALESCE(sku, '') || ' ' ||
    COALESCE(replace(description, '/', ' '), '')
  )
);

COMMENT ON INDEX public.idx_products_fulltext IS
'Índice full-text para productos. Normaliza "/" como separador para buscar nombres alternativos (ej: "85A/35A/36A")';

-- 3. Eliminar funciones anteriores
DROP FUNCTION IF EXISTS public.search_products_fulltext(uuid, text, int);
DROP FUNCTION IF EXISTS public.search_products_hybrid(uuid, text, int);

-- 4. Crear función de búsqueda full-text mejorada
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
  enhanced_description text,
  faq jsonb,
  benefits text,
  usage_instructions text,
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
    p.enhanced_description,
    p.faq,
    p.benefits,
    p.usage_instructions,
    ts_rank(
      to_tsvector('spanish',
        -- Normalizar "/" como espacio para búsqueda
        COALESCE(replace(p.product_name, '/', ' '), '') || ' ' ||
        COALESCE(p.sku, '') || ' ' ||
        COALESCE(replace(p.description, '/', ' '), '')
      ),
      plainto_tsquery('spanish', p_query)
    )::real AS relevance_score
  FROM public.products p
  WHERE p.user_id = p_user_id
    AND to_tsvector('spanish',
      -- Normalizar "/" como espacio para búsqueda
      COALESCE(replace(p.product_name, '/', ' '), '') || ' ' ||
      COALESCE(p.sku, '') || ' ' ||
      COALESCE(replace(p.description, '/', ' '), '')
    ) @@ plainto_tsquery('spanish', p_query)
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.search_products_fulltext IS
'Búsqueda full-text de productos. Normaliza "/" para encontrar nombres alternativos (ej: buscar "85A" encuentra "85A/35A/36A")';

-- 5. Crear función híbrida mejorada
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
        -- Normalizar "/" como espacio para búsqueda
        COALESCE(replace(p.product_name, '/', ' '), '') || ' ' ||
        COALESCE(p.sku, '') || ' ' ||
        COALESCE(replace(p.description, '/', ' '), '')
      ),
      plainto_tsquery('spanish', p_query)
    )::real AS relevance_score
  FROM public.products p
  WHERE p.user_id = p_user_id
    AND to_tsvector('spanish',
      -- Normalizar "/" como espacio para búsqueda
      COALESCE(replace(p.product_name, '/', ' '), '') || ' ' ||
      COALESCE(p.sku, '') || ' ' ||
      COALESCE(replace(p.description, '/', ' '), '')
    ) @@ plainto_tsquery('spanish', p_query)
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.search_products_hybrid IS
'Búsqueda híbrida de productos. Normaliza "/" para encontrar nombres alternativos (ej: buscar "85A" encuentra "85A/35A/36A")';
