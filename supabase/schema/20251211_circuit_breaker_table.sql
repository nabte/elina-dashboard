-- ============================================
-- Tabla para Circuit Breaker Pattern
-- Detecta cuando OpenAI está caído y activa fallback
-- ============================================

-- 1. Tabla para estado del circuit breaker
CREATE TABLE IF NOT EXISTS public.circuit_breaker_state (
  service text PRIMARY KEY, -- Nombre del servicio (ej: 'openai_embeddings')
  state text NOT NULL DEFAULT 'closed', -- 'closed', 'open', 'half-open'
  failure_count integer NOT NULL DEFAULT 0,
  last_failure_time timestamptz,
  success_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (state IN ('closed', 'open', 'half-open'))
);

COMMENT ON TABLE public.circuit_breaker_state IS 
'Estado del circuit breaker para servicios externos. Detecta cuando un servicio está caído y activa fallback.';

-- 2. Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_service 
ON public.circuit_breaker_state (service);

-- 3. Inicializar estado para OpenAI embeddings
INSERT INTO public.circuit_breaker_state (service, state, failure_count, success_count)
VALUES ('openai_embeddings', 'closed', 0, 0)
ON CONFLICT (service) DO NOTHING;

-- 4. Función para resetear circuit breaker (útil para testing o recuperación manual)
CREATE OR REPLACE FUNCTION public.reset_circuit_breaker(p_service text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.circuit_breaker_state
  SET 
    state = 'closed',
    failure_count = 0,
    success_count = 0,
    last_failure_time = NULL,
    updated_at = now()
  WHERE service = p_service;
END;
$$;

COMMENT ON FUNCTION public.reset_circuit_breaker IS 
'Resetea el circuit breaker de un servicio a estado cerrado (funcionando normalmente).';

-- 5. Permisos
GRANT EXECUTE ON FUNCTION public.reset_circuit_breaker(text) TO authenticated, anon;

