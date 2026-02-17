-- ============================================
-- Restaurar función handle_new_user a la versión original que funcionaba
-- Basado en 20251112_fix_profile_bootstrap.sql
-- ============================================

-- Actualizar la función handle_new_user a la versión original (sin excepciones)
-- Esta es la versión que funcionaba antes
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
END;
$$;

-- Verificar que la función se actualizó correctamente
SELECT 
    proname as function_name,
    'Función restaurada a versión original ✅' as status
FROM pg_proc
WHERE proname = 'handle_new_user';

