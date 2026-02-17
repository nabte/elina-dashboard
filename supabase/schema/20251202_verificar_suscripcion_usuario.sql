-- ============================================
-- Verificar si un usuario tiene suscripción
-- ============================================

-- Reemplaza este ID con el ID del usuario que acabas de registrar
-- Ejemplo: 'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4'
DO $$
DECLARE
    user_id_to_check uuid := 'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4'; -- Cambia este ID
    has_subscription boolean;
    subscription_data record;
BEGIN
    -- Verificar si existe la suscripción
    SELECT EXISTS(
        SELECT 1 
        FROM public.subscriptions 
        WHERE subscriptions.user_id = user_id_to_check
    ) INTO has_subscription;
    
    IF has_subscription THEN
        -- Obtener datos de la suscripción
        SELECT * INTO subscription_data
        FROM public.subscriptions
        WHERE subscriptions.user_id = user_id_to_check
        LIMIT 1;
        
        RAISE NOTICE '✅ El usuario SÍ tiene suscripción:';
        RAISE NOTICE '   - Plan: %', subscription_data.plan_type;
        RAISE NOTICE '   - Estado: %', subscription_data.status;
        RAISE NOTICE '   - Trial termina: %', subscription_data.trial_ends_at;
        RAISE NOTICE '   - Creada: %', subscription_data.created_at;
    ELSE
        RAISE NOTICE '❌ El usuario NO tiene suscripción';
        RAISE NOTICE '   Esto puede causar problemas si la app necesita verificar el plan del usuario';
    END IF;
END $$;

-- También mostrar todos los usuarios recientes y sus suscripciones
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    CASE 
        WHEN s.id IS NOT NULL THEN '✅ Tiene suscripción'
        ELSE '❌ Sin suscripción'
    END as subscription_status,
    s.plan_type,
    s.status,
    s.trial_ends_at,
    s.created_at as subscription_created_at
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id
ORDER BY p.created_at DESC
LIMIT 10;

