-- ============================================
-- Fix: Auto-create subscription when creating new user
-- Problem: Users can't login if they don't have a subscription
-- ============================================

-- 1. Update the trigger to automatically create subscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  default_full_name text := nullif(metadata->>'full_name', '');
  default_phone text := nullif(metadata->>'phone', '');
  default_timezone text := coalesce(nullif(metadata->>'timezone', ''), 'America/Mexico_City');
  instance_source text := coalesce(
    nullif(metadata->>'company', ''),
    nullif(metadata->>'business_name', ''),
    nullif(metadata->>'evolution_instance_name', ''),
    default_full_name,
    split_part(new.email, '@', 1)
  );
  generated_api_key text := upper(gen_random_uuid()::text);
  branding jsonb := coalesce(
    metadata->'branding_settings',
    jsonb_build_object(
      'colors', jsonb_build_array('#020b1d', '#1061b7', '#eaf915', '#bf0d4b'),
      'logo_url', null
    )
  );
  gallery jsonb := coalesce(metadata->'gallery_images', '[]'::jsonb);
  now_utc timestamptz := timezone('utc', now());
  work_start_hour int := coalesce(
    case when (metadata->>'work_start_hour') ~ '^-?\d+$' then (metadata->>'work_start_hour')::int end,
    9
  );
  work_end_hour int := coalesce(
    case when (metadata->>'work_end_hour') ~ '^-?\d+$' then (metadata->>'work_end_hour')::int end,
    18
  );
BEGIN
  -- Insert profile
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
    new.id,
    coalesce(default_full_name, split_part(new.email, '@', 1)),
    default_phone,
    coalesce(instance_source, 'Instance ' || left(new.id::text, 8)),
    coalesce(nullif(metadata->>'evolution_api_key', ''), generated_api_key),
    work_start_hour,
    work_end_hour,
    false,
    now_utc,
    new.email,
    'Cargando',
    null,
    0,
    now_utc,
    default_timezone,
    nullif(metadata->>'company_description', ''),
    nullif(metadata->>'website', ''),
    coalesce(metadata->'social_media', '{}'::jsonb),
    coalesce(nullif(metadata->>'role', ''), 'user'),
    nullif(metadata->>'stripe_customer_id', ''),
    branding,
    gallery,
    0,
    0,
    0,
    nullif(metadata->>'urlfoto', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = excluded.full_name,
      contact_phone = excluded.contact_phone,
      evolution_instance_name = excluded.evolution_instance_name,
      evolution_api_key = excluded.evolution_api_key,
      updated_at = excluded.updated_at,
      timezone = excluded.timezone,
      role = excluded.role,
      branding_settings = excluded.branding_settings,
      gallery_images = excluded.gallery_images;

  -- Auto-create free trial subscription (15 days)
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    trial_started_at,
    trial_ends_at
  )
  VALUES (
    new.id,
    'free_trial',
    'active',
    now_utc,
    now_utc + INTERVAL '15 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

-- Restore trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix existing users without subscription
DO $$
DECLARE
  r record;
  now_utc timestamptz := timezone('utc', now());
  fixed_count int := 0;
BEGIN
  -- Find users with profile but no subscription
  FOR r IN
    SELECT p.id, p.email, p.full_name
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id
    )
    AND p.role != 'superadmin' -- Don't create subscriptions for superadmins
  LOOP
    -- Create free trial subscription
    INSERT INTO public.subscriptions (
      user_id,
      plan_id,
      status,
      trial_started_at,
      trial_ends_at
    )
    VALUES (
      r.id,
      'free_trial',
      'active',
      now_utc,
      now_utc + INTERVAL '15 days'
    )
    ON CONFLICT (user_id) DO NOTHING;

    fixed_count := fixed_count + 1;
    RAISE NOTICE 'Created subscription for user: % (%)', r.email, r.full_name;
  END LOOP;

  RAISE NOTICE 'Fixed % users without subscription', fixed_count;
END;
$$;

-- 3. Verify the fix
DO $$
DECLARE
  users_without_sub int;
BEGIN
  SELECT COUNT(*)
  INTO users_without_sub
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id
  )
  AND p.role != 'superadmin';

  IF users_without_sub > 0 THEN
    RAISE WARNING 'Still have % users without subscription (excluding superadmins)', users_without_sub;
  ELSE
    RAISE NOTICE 'All users now have subscriptions';
  END IF;
END;
$$;