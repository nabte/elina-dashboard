-- Migración: Sistema de Rate Limiting para Embeddings
-- Fecha: 2025-12-11
-- Descripción: Crea tabla y funciones para trackear y limitar solicitudes a OpenAI

-- Tabla para trackear rate limiting de embeddings
CREATE TABLE IF NOT EXISTS public.embedding_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_time timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  error_type text
);

-- Índice para consultas rápidas por tiempo
CREATE INDEX IF NOT EXISTS idx_embedding_rate_limit_time ON public.embedding_rate_limit(request_time);

-- Índice para consultas por éxito/error
CREATE INDEX IF NOT EXISTS idx_embedding_rate_limit_success ON public.embedding_rate_limit(success, request_time);

-- Comentarios
COMMENT ON TABLE public.embedding_rate_limit IS 'Registra todas las solicitudes de embeddings para control de rate limiting';
COMMENT ON COLUMN public.embedding_rate_limit.request_time IS 'Timestamp de cuando se hizo la solicitud';
COMMENT ON COLUMN public.embedding_rate_limit.success IS 'Indica si la solicitud fue exitosa';
COMMENT ON COLUMN public.embedding_rate_limit.error_type IS 'Tipo de error si falló: rate_limit, quota_exceeded, other';

-- Función para verificar rate limit (máximo 50 solicitudes por minuto)
CREATE OR REPLACE FUNCTION public.check_embedding_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count integer;
  v_max_per_minute integer := 50; -- Límite conservador (ajustable según plan de OpenAI)
BEGIN
  -- Contar solicitudes en el último minuto
  SELECT COUNT(*)
  INTO v_count
  FROM public.embedding_rate_limit
  WHERE request_time > now() - interval '1 minute';
  
  -- Si excede el límite, retornar false
  IF v_count >= v_max_per_minute THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Función para registrar una solicitud
CREATE OR REPLACE FUNCTION public.record_embedding_request(
  p_success boolean,
  p_error_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.embedding_rate_limit (success, error_type)
  VALUES (p_success, p_error_type);
  
  -- Limpiar registros antiguos (más de 1 hora) para mantener la tabla pequeña
  DELETE FROM public.embedding_rate_limit
  WHERE request_time < now() - interval '1 hour';
END;
$$;

-- Comentarios de funciones
COMMENT ON FUNCTION public.check_embedding_rate_limit() IS 'Verifica si se puede hacer una solicitud basado en el límite de solicitudes por minuto';
COMMENT ON FUNCTION public.record_embedding_request(boolean, text) IS 'Registra una solicitud de embedding (éxito o fallo) y limpia registros antiguos';

-- Permisos
GRANT EXECUTE ON FUNCTION public.check_embedding_rate_limit() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_embedding_request(boolean, text) TO authenticated, anon;

