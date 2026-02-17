-- ============================================
-- Agregar creación de suscripción al trigger handle_new_user
-- ============================================

-- Primero, asegurar que la tabla subscriptions existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        CREATE TABLE public.subscriptions (
            id uuid primary key default uuid_generate_v4(),
            user_id uuid not null references auth.users(id) on delete cascade,
            plan_type text default 'trial',
            trial_ends_at timestamptz,
            status text default 'active',
            created_at timestamptz not null default timezone('utc', now()),
            updated_at timestamptz not null default timezone('utc', now())
        );

        CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions (user_id);
        
        ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
        
        -- Políticas RLS
        CREATE POLICY "Users can insert their own subscriptions"
            ON public.subscriptions FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can view their own subscriptions"
            ON public.subscriptions FOR SELECT
            USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own subscriptions"
            ON public.subscriptions FOR UPDATE
            USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Tabla subscriptions creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla subscriptions ya existe';
    END IF;
END $$;

-- Asegurar que la política de INSERT existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'subscriptions' 
          AND policyname = 'Users can insert their own subscriptions'
    ) THEN
        CREATE POLICY "Users can insert their own subscriptions"
            ON public.subscriptions FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE 'Política de INSERT agregada a subscriptions';
    ELSE
        RAISE NOTICE 'Política de INSERT ya existe en subscriptions';
    END IF;
END $$;

-- Modificar la función handle_new_user para que también cree la suscripción
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
  -- Crear perfil
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

  -- ✅ NUEVO: Crear suscripción de prueba automáticamente
  -- Usando la estructura real: plan_id (no plan_type), trial_started_at, trial_ends_at
  INSERT INTO public.subscriptions (user_id, plan_id, status, trial_started_at, trial_ends_at)
  VALUES (
    NEW.id,
    'free_trial', -- Ajusta este valor según tu tabla plans
    'active',
    now_utc,
    now_utc + INTERVAL '7 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Verificar permisos de is_superadmin (por si acaso)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
        GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;
        RAISE NOTICE 'Permisos de is_superadmin actualizados';
    ELSE
        RAISE NOTICE 'Función is_superadmin no existe (no es necesario)';
    END IF;
END $$;

