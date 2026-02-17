-- ============================================
-- Update: Restore missing trigger and fix missing profiles
-- ============================================

-- 1. Restore the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Retroactive fix for users missing profiles
DO $$
DECLARE
  r record;
  meta jsonb;
  default_name text;
  default_phone text;
  instance_source text;
  generated_api_key text;
  branding jsonb;
  gallery jsonb;
BEGIN
  FOR r IN 
    SELECT * FROM auth.users u 
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  LOOP
    -- Extract logic matching handle_new_user
    meta := COALESCE(r.raw_user_meta_data, '{}'::jsonb);
    default_name := COALESCE(meta->>'full_name', split_part(r.email, '@', 1));
    default_phone := NULLIF(meta->>'phone', '');
    instance_source := COALESCE(meta->>'evolution_instance_name', 'Instance ' || left(r.id::text, 8));
    generated_api_key := upper(substring(md5(random()::text || r.id::text) from 1 for 36));
    
    branding := COALESCE(
        meta->'branding_settings',
        '{"colors": ["#020b1d", "#1061b7", "#eaf915", "#bf0d4b"], "logo_url": null}'::jsonb
    );
    gallery := COALESCE(meta->'gallery_images', '[]'::jsonb);

    -- Insert Profile
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
        r.id,
        default_name,
        default_phone,
        instance_source,
        COALESCE(NULLIF(meta->>'evolution_api_key', ''), generated_api_key),
        9, 18, false,
        now(),
        r.email,
        'Cargando',
        NULL,
        0, now(),
        'America/Mexico_City',
        NULLIF(meta->>'company_description', ''),
        NULLIF(meta->>'website', ''),
        COALESCE(meta->'social_media', '{}'::jsonb),
        COALESCE(NULLIF(meta->>'role', ''), 'user'),
        NULLIF(meta->>'stripe_customer_id', ''),
        branding,
        gallery,
        0, 0, 0,
        NULLIF(meta->>'urlfoto', '')
    );
    
    -- Insert Subscription
    INSERT INTO public.subscriptions (
        user_id, plan_id, status, trial_started_at, trial_ends_at
    )
    VALUES (
        r.id, 'free_trial', 'active', now(), now() + INTERVAL '15 days'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Fixed profile for user: %', r.email;
  END LOOP;
END;
$$;
