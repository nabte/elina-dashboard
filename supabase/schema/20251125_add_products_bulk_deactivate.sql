-- ============================================
-- Agregar campos is_active y labels a productos
-- y función para desactivar en masa
-- ============================================

-- 1. Agregar campo is_active a productos (si no existe)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.products.is_active IS 'Indica si el producto está activo y disponible para venta';

-- 2. Agregar campo labels a productos (si no existe)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.products.labels IS 'Etiquetas para categorizar y filtrar productos';

-- 2.1. Agregar campo updated_at si no existe
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Crear índice para mejorar búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_labels ON public.products USING GIN(labels);

-- 4. Eliminar función si existe (para recrearla sin errores)
DROP FUNCTION IF EXISTS public.bulk_update_products_status(uuid, boolean, text[], text[], boolean);

-- 5. Función para desactivar/activar productos en masa por etiqueta o todos según estado
CREATE FUNCTION public.bulk_update_products_status(
  p_user_id uuid,
  p_is_active boolean,
  p_label_filter text[] default null,
  p_search_term text default null,
  p_current_status_filter boolean default null
)
RETURNS TABLE(updated_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_query text;
  v_where_clauses text[] := array[]::text[];
  v_updated_count bigint;
BEGIN
  -- Construir condiciones WHERE
  v_where_clauses := array_append(v_where_clauses, format('user_id = %L', p_user_id));
  
  -- Filtro por estado actual si se proporciona
  IF p_current_status_filter IS NOT NULL THEN
    v_where_clauses := array_append(v_where_clauses, format('is_active = %s', p_current_status_filter));
  END IF;
  
  -- Filtro por etiquetas si se proporciona
  IF p_label_filter IS NOT NULL AND array_length(p_label_filter, 1) > 0 THEN
    v_where_clauses := array_append(v_where_clauses, format('labels && %L::text[]', p_label_filter));
  END IF;
  
  -- Filtro por búsqueda si se proporciona
  IF p_search_term IS NOT NULL AND length(trim(p_search_term)) > 0 THEN
    v_where_clauses := array_append(v_where_clauses, format(
      '(product_name ilike %L OR sku ilike %L OR description ilike %L)',
      '%' || p_search_term || '%',
      '%' || p_search_term || '%',
      '%' || p_search_term || '%'
    ));
  END IF;
  
  -- Construir y ejecutar la actualización
  v_query := format('
    UPDATE public.products
    SET is_active = %s,
        updated_at = now()
    WHERE %s
  ', p_is_active, array_to_string(v_where_clauses, ' AND '));
  
  EXECUTE v_query;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_updated_count;
END;
$$;

-- 6. Otorgar permisos
REVOKE ALL ON FUNCTION public.bulk_update_products_status(uuid, boolean, text[], text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_update_products_status(uuid, boolean, text[], text[], boolean) TO authenticated;

COMMENT ON FUNCTION public.bulk_update_products_status IS 'Desactiva o activa productos en masa según filtros de etiqueta, búsqueda y estado actual';

