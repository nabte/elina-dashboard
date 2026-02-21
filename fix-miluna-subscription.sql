-- Crear suscripción para el usuario miluna
INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  trial_started_at,
  trial_ends_at
)
VALUES (
  'bd3dfc25-ab7a-4e33-92db-d7c87aafacbd', -- ID del usuario miluna
  'free_trial',
  'active',
  timezone('utc', now()),
  timezone('utc', now()) + INTERVAL '15 days'
)
ON CONFLICT (user_id) DO UPDATE
  SET
    trial_started_at = EXCLUDED.trial_started_at,
    trial_ends_at = EXCLUDED.trial_ends_at,
    status = 'active';

-- Verificar que se creó
SELECT
  u.email,
  u.full_name,
  u.evolution_instance_name,
  s.plan_id,
  s.status,
  s.trial_ends_at
FROM profiles u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.id = 'bd3dfc25-ab7a-4e33-92db-d7c87aafacbd';
