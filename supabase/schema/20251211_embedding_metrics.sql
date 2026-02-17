-- ============================================
-- Sistema de Métricas y Observabilidad para Embeddings
-- Trackea rendimiento, cache hit rate, y errores
-- ============================================

-- 1. Tabla de métricas de embeddings
CREATE TABLE IF NOT EXISTS public.embedding_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL, -- 'generation_time', 'cache_hit', 'cache_miss', 'error', 'intent_type'
  metric_value numeric NOT NULL, -- Valor de la métrica (tiempo en ms, 1/0 para hit/miss, etc.)
  metadata jsonb DEFAULT '{}'::jsonb, -- Información adicional (modelo usado, tipo de error, etc.)
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.embedding_metrics IS 
'Tabla para trackear métricas del sistema de embeddings: tiempos, cache hits, errores, etc.';

-- 2. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_embedding_metrics_type_created 
ON public.embedding_metrics (metric_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_embedding_metrics_created 
ON public.embedding_metrics (created_at DESC);

-- 3. Función para registrar métricas
CREATE OR REPLACE FUNCTION public.record_embedding_metric(
  p_metric_type text,
  p_metric_value numeric,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  INSERT INTO public.embedding_metrics (metric_type, metric_value, metadata)
  VALUES (p_metric_type, p_metric_value, p_metadata)
  RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$;

COMMENT ON FUNCTION public.record_embedding_metric IS 
'Registra una métrica del sistema de embeddings. Retorna el ID del registro creado.';

-- 4. Función para obtener estadísticas de cache hit rate
CREATE OR REPLACE FUNCTION public.get_cache_hit_rate_stats(
  p_hours_back int DEFAULT 24
)
RETURNS TABLE(
  total_requests bigint,
  cache_hits bigint,
  cache_misses bigint,
  hit_rate_percent numeric,
  avg_generation_time_ms numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE metric_type = 'cache_hit' OR metric_type = 'cache_miss') AS total_requests,
      COUNT(*) FILTER (WHERE metric_type = 'cache_hit') AS cache_hits,
      COUNT(*) FILTER (WHERE metric_type = 'cache_miss') AS cache_misses,
      AVG(metric_value) FILTER (WHERE metric_type = 'generation_time') AS avg_generation_time
    FROM public.embedding_metrics
    WHERE created_at >= now() - (p_hours_back || ' hours')::interval
  )
  SELECT 
    stats.total_requests,
    stats.cache_hits,
    stats.cache_misses,
    CASE 
      WHEN stats.total_requests > 0 
      THEN (stats.cache_hits::numeric / stats.total_requests::numeric * 100)
      ELSE 0
    END AS hit_rate_percent,
    COALESCE(stats.avg_generation_time, 0) AS avg_generation_time_ms
  FROM stats;
END;
$$;

COMMENT ON FUNCTION public.get_cache_hit_rate_stats IS 
'Retorna estadísticas de cache hit rate y tiempo promedio de generación para las últimas N horas.';

-- 5. Función para obtener distribución de tipos de intención
CREATE OR REPLACE FUNCTION public.get_intent_type_distribution(
  p_hours_back int DEFAULT 24
)
RETURNS TABLE(
  intent_type text,
  count bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  WITH intent_stats AS (
    SELECT 
      metadata->>'intent_type' AS intent_type,
      COUNT(*) AS count
    FROM public.embedding_metrics
    WHERE metric_type = 'intent_type'
      AND created_at >= now() - (p_hours_back || ' hours')::interval
    GROUP BY metadata->>'intent_type'
  ),
  total_count AS (
    SELECT SUM(count) AS total FROM intent_stats
  )
  SELECT 
    COALESCE(intent_stats.intent_type, 'unknown') AS intent_type,
    intent_stats.count,
    CASE 
      WHEN total_count.total > 0 
      THEN (intent_stats.count::numeric / total_count.total::numeric * 100)
      ELSE 0
    END AS percentage
  FROM intent_stats, total_count
  ORDER BY intent_stats.count DESC;
END;
$$;

COMMENT ON FUNCTION public.get_intent_type_distribution IS 
'Retorna distribución de tipos de intención detectados en las últimas N horas.';

-- 6. Función para limpiar métricas antiguas (mantener solo últimos 30 días)
CREATE OR REPLACE FUNCTION public.cleanup_old_embedding_metrics(
  p_days_to_keep int DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted_count int;
BEGIN
  DELETE FROM public.embedding_metrics
  WHERE created_at < now() - (p_days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_embedding_metrics IS 
'Limpia métricas antiguas, manteniendo solo los últimos N días. Retorna número de registros eliminados.';

-- 7. Permisos
GRANT EXECUTE ON FUNCTION public.record_embedding_metric(text, numeric, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_cache_hit_rate_stats(int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_intent_type_distribution(int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_embedding_metrics(int) TO authenticated, anon;

-- 8. Política RLS (solo lectura para usuarios autenticados)
ALTER TABLE public.embedding_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics" ON public.embedding_metrics
  FOR SELECT
  USING (true); -- Por ahora permitir lectura a todos, ajustar según necesidades

