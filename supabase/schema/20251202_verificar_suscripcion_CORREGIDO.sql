-- ============================================
-- Verificar si un usuario tiene suscripción (CORREGIDO)
-- ============================================

-- La tabla subscriptions usa user_id como PK, no tiene columna id separada
-- Reemplaza este ID con el ID del usuario que acabas de registrar
-- Ejemplo: 'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4'

-- Verificar estructura de la tabla primero
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- Verificar si el usuario tiene suscripción
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    CASE 
        WHEN s.user_id IS NOT NULL THEN '✅ Tiene suscripción'
        ELSE '❌ Sin suscripción'
    END as subscription_status,
    s.plan_id,
    s.status,
    s.trial_started_at,
    s.trial_ends_at,
    s.stripe_customer_id,
    s.current_period_end
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id
WHERE p.id = 'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4' -- Cambia este ID
LIMIT 1;

-- Mostrar todos los usuarios recientes y sus suscripciones
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    CASE 
        WHEN s.user_id IS NOT NULL THEN '✅ Tiene suscripción'
        ELSE '❌ Sin suscripción'
    END as subscription_status,
    s.plan_id,
    s.status,
    s.trial_started_at,
    s.trial_ends_at,
    s.current_period_end
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id
ORDER BY p.updated_at DESC
LIMIT 10;

