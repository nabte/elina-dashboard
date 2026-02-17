-- ============================================
-- SQL PARA APLICAR RATE LIMITING DE EMBEDDINGS
-- ============================================
-- Copia y pega este SQL completo en Supabase SQL Editor
-- Ejecuta todo de una vez (Ctrl+Enter)

-- Tabla para trackear rate limiting de embeddings
CREATE TABLE IF NOT EXISTS public.embedding_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_time timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  error_type text
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_embedding_rate_limit_time ON public.embedding_rate_limit(request_time);

-- Función para verificar rate limit (máximo 50 solicitudes por minuto)
CREATE OR REPLACE FUNCTION public.check_embedding_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count integer;
  v_max_per_minute integer := 50; -- Límite conservador
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
  
  -- Limpiar registros antiguos (más de 1 hora)
  DELETE FROM public.embedding_rate_limit
  WHERE request_time < now() - interval '1 hour';
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.check_embedding_rate_limit() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_embedding_request(boolean, text) TO authenticated, anon;

-- ============================================
-- VERIFICACIÓN (opcional, ejecuta después)
-- ============================================
-- SELECT * FROM public.embedding_rate_limit LIMIT 5;
-- SELECT public.check_embedding_rate_limit();

