-- ============================================
-- Crear suscripción para usuario existente
-- ============================================
-- 
-- Usa este SQL si el usuario ya existe y no tiene suscripción
-- Reemplaza el user_id con el ID del usuario
-- ============================================

-- Reemplaza este ID con el ID del usuario
-- Ejemplo: 'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4'
INSERT INTO public.subscriptions (
    user_id, 
    plan_id, 
    status, 
    trial_started_at, 
    trial_ends_at
)
VALUES (
    'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4', -- Cambia este ID
    'free_trial', -- Ajusta según tu tabla plans
    'active',
    NOW(),
    NOW() + INTERVAL '7 days'
)
ON CONFLICT (user_id) DO NOTHING;

-- Verificar que se creó
SELECT 
    user_id,
    plan_id,
    status,
    trial_started_at,
    trial_ends_at
FROM public.subscriptions
WHERE user_id = 'de7bcd2c-f3a0-4c6f-a1ea-75e9326e72e4'; -- Cambia este ID

