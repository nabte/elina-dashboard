-- ============================================
-- Sistema de Bloqueo de Cuenta
-- ============================================
-- Este archivo agrega la funcionalidad de bloqueo de cuenta
-- usando las funciones existentes de incremento

-- ============================================
-- Agregar columna last_payment_at si no existe
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'subscriptions' 
        AND column_name = 'last_payment_at'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN last_payment_at timestamptz;
        
        -- Si existe current_period_end, usarlo como referencia inicial
        UPDATE public.subscriptions
        SET last_payment_at = current_period_end
        WHERE last_payment_at IS NULL 
        AND current_period_end IS NOT NULL
        AND status = 'active';
        
        RAISE NOTICE 'Columna last_payment_at agregada a subscriptions';
    ELSE
        RAISE NOTICE 'Columna last_payment_at ya existe';
    END IF;
END $$;

-- ============================================
-- Función para verificar acceso de cuenta
-- ============================================
CREATE OR REPLACE FUNCTION public.check_account_access(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_subscription record;
  v_blocked boolean := false;
  v_reason text := '';
  v_now timestamptz := timezone('utc', now());
  v_last_payment timestamptz;
BEGIN
  -- Obtener información de la suscripción
  SELECT 
    s.status,
    s.plan_id,
    s.trial_ends_at,
    s.stripe_subscription_id,
    s.last_payment_at,
    s.current_period_end
  INTO v_subscription
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;
  
  -- Si no hay suscripción, la cuenta está bloqueada
  IF v_subscription IS NULL THEN
    RETURN jsonb_build_object(
      'blocked', true,
      'reason', 'No tienes una suscripción activa. Por favor, suscríbete para continuar.'
    );
  END IF;
  
  -- Verificar si el trial ha vencido sin pago
  IF v_subscription.status = 'trialing' 
     AND v_subscription.trial_ends_at IS NOT NULL 
     AND v_subscription.trial_ends_at < v_now
     AND (v_subscription.stripe_subscription_id IS NULL OR v_subscription.stripe_subscription_id = '') THEN
    v_blocked := true;
    v_reason := 'Tu período de prueba ha finalizado. Por favor, suscríbete a un plan para continuar usando el servicio.';
  END IF;
  
  -- Verificar si han pasado 30 días desde el último pago (solo para suscripciones activas)
  IF NOT v_blocked 
     AND v_subscription.status = 'active' 
     AND v_subscription.plan_id != 'free_trial' THEN
    -- Usar last_payment_at si existe, sino usar current_period_end
    v_last_payment := COALESCE(v_subscription.last_payment_at, v_subscription.current_period_end);
    
    IF v_last_payment IS NOT NULL AND v_last_payment < (v_now - INTERVAL '30 days') THEN
      v_blocked := true;
      v_reason := 'Tu suscripción ha expirado. Han pasado más de 30 días desde tu último pago. Por favor, renueva tu suscripción para continuar.';
    END IF;
  END IF;
  
  -- Retornar resultado
  RETURN jsonb_build_object(
    'blocked', v_blocked,
    'reason', v_reason,
    'status', v_subscription.status,
    'plan_id', v_subscription.plan_id
  );
END;
$$;

-- Permisos
REVOKE ALL ON FUNCTION public.check_account_access(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.check_account_access(uuid) TO authenticated;

-- Comentario
COMMENT ON FUNCTION public.check_account_access(uuid) IS 'Verifica si una cuenta debe estar bloqueada por trial vencido sin pago o por falta de pago (30 días después del último pago)';

-- ============================================
-- Modificar funciones de incremento EXISTENTES para verificar bloqueo
-- ============================================
-- Usamos las funciones que ya existen: increment_text_usage, increment_image_usage, increment_video_usage

-- Modificar increment_text_usage (ya existe, solo agregamos verificación de bloqueo)
CREATE OR REPLACE FUNCTION public.increment_text_usage(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_limit int;
  v_used int;
  v_access_check jsonb;
BEGIN
  -- Verificar acceso primero
  v_access_check := public.check_account_access(p_user_id);
  
  IF (v_access_check->>'blocked')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', v_access_check->>'reason'
    );
  END IF;
  
  -- Obtener límite y uso actual (código original)
  SELECT 
    p.ai_enhancements_limit,
    pr.ai_enhancements_used
  INTO v_limit, v_used
  FROM public.profiles pr
  LEFT JOIN public.subscriptions s ON s.user_id = pr.id
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE pr.id = p_user_id;
  
  -- Si no se encuentra el usuario, retornar error
  IF v_used IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuario no encontrado'
    );
  END IF;
  
  -- Verificar si se ha alcanzado el límite
  IF v_limit > 0 AND v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Has alcanzado tu límite de mejoras de texto para este mes'
    );
  END IF;
  
  -- Incrementar el contador
  UPDATE public.profiles
  SET ai_enhancements_used = ai_enhancements_used + 1
  WHERE id = p_user_id;
  
  -- Retornar éxito
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Uso incrementado correctamente',
    'used', v_used + 1,
    'limit', v_limit
  );
END;
$$;

-- Modificar increment_image_usage (ya existe, solo agregamos verificación de bloqueo)
CREATE OR REPLACE FUNCTION public.increment_image_usage(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_limit int;
  v_used int;
  v_access_check jsonb;
BEGIN
  -- Verificar acceso primero
  v_access_check := public.check_account_access(p_user_id);
  
  IF (v_access_check->>'blocked')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', v_access_check->>'reason'
    );
  END IF;
  
  -- Obtener límite y uso actual (código original)
  SELECT 
    p.image_generations_limit,
    pr.image_generations_used
  INTO v_limit, v_used
  FROM public.profiles pr
  LEFT JOIN public.subscriptions s ON s.user_id = pr.id
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE pr.id = p_user_id;
  
  -- Si no se encuentra el usuario, retornar error
  IF v_used IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuario no encontrado'
    );
  END IF;
  
  -- Verificar si se ha alcanzado el límite
  IF v_limit > 0 AND v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Has alcanzado tu límite de generaciones de imágenes para este mes'
    );
  END IF;
  
  -- Incrementar el contador
  UPDATE public.profiles
  SET image_generations_used = image_generations_used + 1
  WHERE id = p_user_id;
  
  -- Retornar éxito
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Uso incrementado correctamente',
    'used', v_used + 1,
    'limit', v_limit
  );
END;
$$;

-- Modificar increment_video_usage (ya existe, solo agregamos verificación de bloqueo)
CREATE OR REPLACE FUNCTION public.increment_video_usage(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_limit int;
  v_used int;
  v_access_check jsonb;
BEGIN
  -- Verificar acceso primero
  v_access_check := public.check_account_access(p_user_id);
  
  IF (v_access_check->>'blocked')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', v_access_check->>'reason'
    );
  END IF;
  
  -- Obtener límite y uso actual (código original)
  SELECT 
    p.video_generations_limit,
    pr.video_generations_used
  INTO v_limit, v_used
  FROM public.profiles pr
  LEFT JOIN public.subscriptions s ON s.user_id = pr.id
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE pr.id = p_user_id;
  
  -- Si no se encuentra el usuario, retornar error
  IF v_used IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuario no encontrado'
    );
  END IF;
  
  -- Verificar si se ha alcanzado el límite
  IF v_limit > 0 AND v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Has alcanzado tu límite de generaciones de video para este mes'
    );
  END IF;
  
  -- Incrementar el contador
  UPDATE public.profiles
  SET video_generations_used = video_generations_used + 1
  WHERE id = p_user_id;
  
  -- Retornar éxito
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Uso incrementado correctamente',
    'used', v_used + 1,
    'limit', v_limit
  );
END;
$$;
