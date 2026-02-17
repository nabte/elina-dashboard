create extension if not exists "pgcrypto";

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
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
begin
  insert into public.profiles (
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
  values (
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
  on conflict (id) do update
    set
      full_name = excluded.full_name,
      contact_phone = excluded.contact_phone,
      evolution_instance_name = excluded.evolution_instance_name,
      evolution_api_key = excluded.evolution_api_key,
      updated_at = excluded.updated_at,
      timezone = excluded.timezone,
      role = excluded.role,
      branding_settings = excluded.branding_settings,
      gallery_images = excluded.gallery_images;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
