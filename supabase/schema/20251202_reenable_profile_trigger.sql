-- ============================================
-- Re-habilitar trigger que crea perfil automáticamente
-- El trigger crea el perfil básico, y n8n lo actualiza con los datos completos
-- ============================================

-- Re-habilitar el trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Verificar que el trigger está habilitado
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

-- Crear/actualizar la función handle_new_user
-- Esta función crea el perfil básico cuando se registra un usuario
-- n8n luego actualizará los campos específicos (evolution_instance_name, evolution_api_key, etc.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  default_full_name text := NULLIF(metadata->>'full_name', '');
  default_phone text := NULLIF(metadata->>'phone', '');
  default_timezone text := COALESCE(NULLIF(metadata->>'timezone', ''), 'America/Mexico_City');
  instance_source text := COALESCE(
    NULLIF(metadata->>'company', ''),
    NULLIF(metadata->>'business_name', ''),
    NULLIF(metadata->>'evolution_instance_name', ''),
    default_full_name,
    split_part(NEW.email, '@', 1)
  );
  generated_api_key text := UPPER(gen_random_uuid()::text);
  branding jsonb := COALESCE(
    metadata->'branding_settings',
    jsonb_build_object(
      'colors', jsonb_build_array('#020b1d', '#1061b7', '#eaf915', '#bf0d4b'),
      'logo_url', NULL
    )
  );
  gallery jsonb := COALESCE(metadata->'gallery_images', '[]'::jsonb);
  now_utc timestamptz := timezone('utc', now());
  work_start_hour int := COALESCE(
    CASE WHEN (metadata->>'work_start_hour') ~ '^-?\d+$' THEN (metadata->>'work_start_hour')::int END,
    9
  );
  work_end_hour int := COALESCE(
    CASE WHEN (metadata->>'work_end_hour') ~ '^-?\d+$' THEN (metadata->>'work_end_hour')::int END,
    18
  );
BEGIN
  -- Crear perfil con datos básicos
  -- n8n actualizará los campos específicos (evolution_instance_name, evolution_api_key, etc.)
  INSERT INTO public.profiles (
    id,
    full_name,
    contact_phone,
    evolution_instance_name,
    evolution_api_key,
    work_start_hour,
    work_end_hour,
    whatsapp_connected,
    updated_at,
    email,
    sync_status,
    active_campaign_id,
    ai_enhancements_used,
    ai_enhancements_reset_at,
    timezone,
    company_description,
    website,
    social_media,
    role,
    stripe_customer_id,
    branding_settings,
    gallery_images,
    image_generations_used,
    bulk_sends_used,
    video_generations_used,
    urlfoto
  )
  VALUES (
    NEW.id,
    COALESCE(default_full_name, split_part(NEW.email, '@', 1)),
    default_phone,
    COALESCE(instance_source, 'Instance ' || left(NEW.id::text, 8)),
    COALESCE(NULLIF(metadata->>'evolution_api_key', ''), generated_api_key),
    work_start_hour,
    work_end_hour,
    false,
    now_utc,
    NEW.email,
    'Cargando',
    NULL,
    0,
    now_utc,
    default_timezone,
    NULLIF(metadata->>'company_description', ''),
    NULLIF(metadata->>'website', ''),
    COALESCE(metadata->'social_media', '{}'::jsonb),
    COALESCE(NULLIF(metadata->>'role', ''), 'user'),
    NULLIF(metadata->>'stripe_customer_id', ''),
    branding,
    gallery,
    0,
    0,
    0,
    NULLIF(metadata->>'urlfoto', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      contact_phone = EXCLUDED.contact_phone,
      evolution_instance_name = EXCLUDED.evolution_instance_name,
      evolution_api_key = EXCLUDED.evolution_api_key,
      updated_at = EXCLUDED.updated_at,
      timezone = EXCLUDED.timezone,
      role = EXCLUDED.role,
      branding_settings = EXCLUDED.branding_settings,
      gallery_images = EXCLUDED.gallery_images;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla, intentar crear perfil mínimo
    RAISE WARNING 'Error creando perfil completo, creando perfil mínimo: %', SQLERRM;
    INSERT INTO public.profiles (id, full_name, email, updated_at, sync_status, timezone, role)
    VALUES (
      NEW.id,
      COALESCE(default_full_name, split_part(NEW.email, '@', 1)),
      NEW.email,
      now_utc,
      'Cargando',
      default_timezone,
      'user'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Asegurar que el trigger existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_new_user();
        
        RAISE NOTICE 'Trigger on_auth_user_created creado';
    ELSE
        RAISE NOTICE 'Trigger on_auth_user_created ya existe';
    END IF;
END $$;

