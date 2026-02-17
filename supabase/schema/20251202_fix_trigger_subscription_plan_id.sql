-- ============================================
-- Fix: Corregir trigger para usar plan_id en lugar de plan_type
-- ============================================
-- 
-- IMPORTANTE: Ejecuta primero 20251202_verificar_estructura_subscriptions.sql
-- para verificar qué columnas tiene tu tabla subscriptions
-- ============================================

-- Opción 1: Si tu tabla usa plan_id (estructura real)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  now_utc timestamptz := timezone('utc', now());
BEGIN
  -- Crear/actualizar perfil
  INSERT INTO public.profiles (
    id, full_name, email, phone, contact_phone,
    created_at, updated_at, timezone, role, branding_settings
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    now_utc,
    now_utc,
    'America/Mexico_City',
    'user',
    '{"colors": ["#020b1d", "#1061b7", "#eaf915", "#bf0d4b"], "logo_url": null}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    contact_phone = COALESCE(EXCLUDED.contact_phone, profiles.contact_phone),
    updated_at = EXCLUDED.updated_at,
    timezone = COALESCE(EXCLUDED.timezone, profiles.timezone),
    role = COALESCE(EXCLUDED.role, profiles.role),
    branding_settings = COALESCE(EXCLUDED.branding_settings, profiles.branding_settings);

  -- ✅ Crear suscripción de prueba automáticamente
  -- Usando plan_id (estructura real)
  INSERT INTO public.subscriptions (user_id, plan_id, status, trial_ends_at)
  VALUES (
    NEW.id,
    'free_trial', -- Ajusta este valor según tu tabla plans
    'active',
    now_utc + INTERVAL '7 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Opción 2: Si tu tabla usa plan_type (estructura alternativa)
-- Descomenta esto si la verificación muestra que usas plan_type:
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  now_utc timestamptz := timezone('utc', now());
BEGIN
  -- Crear/actualizar perfil (igual que arriba)
  INSERT INTO public.profiles (
    id, full_name, email, phone, contact_phone,
    created_at, updated_at, timezone, role, branding_settings
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    now_utc,
    now_utc,
    'America/Mexico_City',
    'user',
    '{"colors": ["#020b1d", "#1061b7", "#eaf915", "#bf0d4b"], "logo_url": null}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    contact_phone = COALESCE(EXCLUDED.contact_phone, profiles.contact_phone),
    updated_at = EXCLUDED.updated_at,
    timezone = COALESCE(EXCLUDED.timezone, profiles.timezone),
    role = COALESCE(EXCLUDED.role, profiles.role),
    branding_settings = COALESCE(EXCLUDED.branding_settings, profiles.branding_settings);

  -- ✅ Crear suscripción usando plan_type
  INSERT INTO public.subscriptions (user_id, plan_type, status, trial_ends_at)
  VALUES (
    NEW.id,
    'trial',
    'active',
    now_utc + INTERVAL '7 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
*/

