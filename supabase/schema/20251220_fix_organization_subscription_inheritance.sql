-- ============================================
-- Modificar check_account_access para heredar suscripción de organización/equipo
-- ============================================
-- Los usuarios invitados (asesores) deben heredar la suscripción del owner del equipo/organización

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
  v_team_owner_subscription record;
  v_blocked boolean := false;
  v_reason text := '';
  v_now timestamptz := timezone('utc', now());
  v_last_payment timestamptz;
  v_team_owner_id uuid;
BEGIN
  -- Primero, intentar obtener suscripción propia del usuario
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
  
  -- Si el usuario NO tiene suscripción propia, verificar si es miembro de un equipo
  -- y heredar la suscripción del owner del equipo
  IF v_subscription IS NULL THEN
    -- Buscar si el usuario es miembro de un equipo
    SELECT t.owner_id INTO v_team_owner_id
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_user_id
    LIMIT 1;
    
    -- Si es miembro de un equipo, verificar suscripción del owner
    IF v_team_owner_id IS NOT NULL THEN
      SELECT 
        s.status,
        s.plan_id,
        s.trial_ends_at,
        s.stripe_subscription_id,
        s.last_payment_at,
        s.current_period_end
      INTO v_team_owner_subscription
      FROM public.subscriptions s
      WHERE s.user_id = v_team_owner_id
      LIMIT 1;
      
      -- Si el owner tiene suscripción activa, el usuario invitado hereda el acceso
      IF v_team_owner_subscription IS NOT NULL THEN
        -- Usar la suscripción del owner para las verificaciones
        v_subscription := v_team_owner_subscription;
      END IF;
    END IF;
  END IF;
  
  -- Si aún no hay suscripción (ni propia ni heredada), la cuenta está bloqueada
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
    'plan_id', v_subscription.plan_id,
    'inherited', (v_team_owner_id IS NOT NULL) -- Indicar si la suscripción es heredada
  );
END;
$$;

-- Comentario actualizado
COMMENT ON FUNCTION public.check_account_access(uuid) IS 
  'Verifica si una cuenta debe estar bloqueada. Los usuarios invitados heredan la suscripción del owner del equipo.';

