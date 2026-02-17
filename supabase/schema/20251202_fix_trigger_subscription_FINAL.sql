-- ============================================
-- Fix: Corregir trigger para usar estructura real de subscriptions
-- ============================================
-- 
-- Estructura real de subscriptions:
-- - user_id (PK)
-- - plan_id (text) - NO plan_type
-- - status (text)
-- - trial_started_at (timestamptz)
-- - trial_ends_at (timestamptz)
-- - stripe_customer_id (text)
-- - stripe_subscription_id (text)
-- - current_period_end (timestamptz)
-- ============================================

-- Leer la función actual completa primero
DO $$
DECLARE
    current_function_text text;
BEGIN
    -- Obtener el texto completo de la función actual
    SELECT pg_get_functiondef(oid) INTO current_function_text
    FROM pg_proc
    WHERE proname = 'handle_new_user'
      AND pronamespace = 'public'::regnamespace;
    
    RAISE NOTICE 'Función actual encontrada: %', 
        CASE 
            WHEN current_function_text IS NOT NULL THEN 'Sí'
            ELSE 'No'
        END;
END $$;

-- Actualizar solo la parte de creación de suscripción
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  now_utc timestamptz := timezone('utc', now());
  default_full_name text;
  default_phone text;
  default_timezone text := 'America/Mexico_City';
  work_start_hour int := 9;
  work_end_hour int := 18;
  instance_source text;
  generated_api_key text;
  metadata jsonb;
  branding jsonb;
  gallery jsonb;
BEGIN
  -- Extraer metadata
  metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  default_full_name := COALESCE(metadata->>'full_name', split_part(NEW.email, '@', 1));
  default_phone := NULLIF(metadata->>'phone', '');
  instance_source := COALESCE(metadata->>'evolution_instance_name', 'Instance ' || left(NEW.id::text, 8));
  generated_api_key := upper(substring(md5(random()::text || NEW.id::text) from 1 for 36));
  
  -- Configurar branding por defecto
  branding := COALESCE(
    metadata->'branding_settings',
    '{"colors": ["#020b1d", "#1061b7", "#eaf915", "#bf0d4b"], "logo_url": null}'::jsonb
  );
  
  -- Configurar gallery por defecto
  gallery := COALESCE(metadata->'gallery_images', '[]'::jsonb);

  -- Crear/actualizar perfil
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

  -- ✅ CORREGIDO: Crear suscripción de prueba automáticamente
  -- Usando la estructura real: plan_id (no plan_type), trial_started_at, trial_ends_at
  INSERT INTO public.subscriptions (
    user_id, 
    plan_id, 
    status, 
    trial_started_at, 
    trial_ends_at
  )
  VALUES (
    NEW.id,
    'free_trial', -- Ajusta este valor según tu tabla plans (puede ser 'trial', 'free_trial', etc.)
    'active',
    now_utc,
    now_utc + INTERVAL '7 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Verificar que la función se actualizó correctamente
SELECT 
    'Función handle_new_user actualizada correctamente ✅' as resultado,
    proname as function_name
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = 'public'::regnamespace;

