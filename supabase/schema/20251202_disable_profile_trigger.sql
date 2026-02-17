-- ============================================
-- Deshabilitar trigger que crea perfil automáticamente
-- El perfil se crea desde n8n después del registro
-- ============================================

-- Opción 1: Deshabilitar el trigger completamente
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Opción 2: Eliminar el trigger (si prefieres eliminarlo completamente)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Verificar que el trigger está deshabilitado
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    CASE tgenabled
        WHEN 'O' THEN 'Disabled'
        WHEN 'D' THEN 'Disabled (replica)'
        WHEN 'R' THEN 'Disabled (always)'
        WHEN 'A' THEN 'Enabled'
        ELSE 'Unknown'
    END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Nota: Si necesitas crear solo la suscripción automáticamente,
-- puedes crear un trigger más simple que solo cree la suscripción:

-- Función simplificada que solo crea suscripción (sin perfil)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  now_utc timestamptz := timezone('utc', now());
BEGIN
  -- Solo crear suscripción de prueba
  -- El perfil se crea desde n8n
  INSERT INTO public.subscriptions (user_id, plan_type, trial_ends_at, status)
  VALUES (
    NEW.id,
    'trial',
    now_utc + INTERVAL '7 days',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla la suscripción, no bloquear el registro del usuario
    RAISE WARNING 'Error creando suscripción para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Si quieres usar este trigger simplificado, descomenta estas líneas:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user_subscription_only();

