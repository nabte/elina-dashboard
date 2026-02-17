-- ============================================
-- Funciones para obtener información del equipo
-- ============================================
-- Estas funciones son necesarias para el sistema de Plan Business
-- y gestión de advisors/vendedores

-- Eliminar funciones existentes si tienen tipos de retorno diferentes
drop function if exists public.get_user_team_info();
drop function if exists public.get_user_team_info_with_permissions(uuid);
drop function if exists public.create_business_team_for_user(uuid);

-- Función para obtener información del equipo del usuario actual (sin parámetros)
create or replace function public.get_user_team_info()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    return null;
  end if;

  -- Buscar si el usuario es miembro de un equipo
  select jsonb_build_object(
    'team_id', t.id,
    'team_name', t.name,
    'owner_id', t.owner_id,
    'user_id', v_user_id,
    'user_role', tm.role,
    'permissions', tm.permissions,
    'created_at', t.created_at
  )
  into v_result
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = v_user_id
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.get_user_team_info() from public;
grant execute on function public.get_user_team_info() to authenticated;

-- Función para obtener información del equipo con permisos (con parámetro)
create or replace function public.get_user_team_info_with_permissions(p_user_id uuid)
returns table(
  team_id uuid,
  team_name text,
  owner_id uuid,
  user_id uuid,
  user_role text,
  permissions jsonb,
  profiles jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return query
  select 
    t.id as team_id,
    t.name as team_name,
    t.owner_id,
    tm.user_id,
    tm.role::text as user_role,
    tm.permissions,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email
    ) as profiles,
    t.created_at
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  left join public.profiles p on p.id = tm.user_id
  where tm.user_id = p_user_id
  limit 1;
end;
$$;

revoke all on function public.get_user_team_info_with_permissions(uuid) from public;
grant execute on function public.get_user_team_info_with_permissions(uuid) to authenticated;

-- Función para crear un equipo business para un usuario
-- Esta función crea el equipo, asigna al usuario como admin y crea la suscripción business
create or replace function public.create_business_team_for_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_team_id uuid;
  v_user_profile record;
  v_existing_team_id uuid;
  v_existing_subscription record;
begin
  -- Verificar que el usuario existe
  select id, full_name, email
  into v_user_profile
  from public.profiles
  where id = p_user_id;
  
  if v_user_profile is null then
    raise exception 'Usuario no encontrado';
  end if;

  -- Verificar si el usuario ya tiene un equipo
  select t.id into v_existing_team_id
  from public.teams t
  where t.owner_id = p_user_id
  limit 1;

  -- Si ya tiene equipo, usar ese; si no, crear uno nuevo
  if v_existing_team_id is not null then
    v_team_id := v_existing_team_id;
  else
    -- Crear el equipo
    insert into public.teams (owner_id, name)
    values (
      p_user_id,
      coalesce(v_user_profile.full_name, v_user_profile.email, 'Mi Equipo')
    )
    returning id into v_team_id;
  end if;

  -- Agregar al usuario como admin del equipo (si no está ya)
  insert into public.team_members (team_id, user_id, role, permissions)
  values (
    v_team_id,
    p_user_id,
    'admin',
    jsonb_build_object(
      'chats', true,
      'follow-ups', true,
      'kanban', true,
      'contacts', true,
      'label_filters', jsonb_build_object()
    )
  )
  on conflict (team_id, user_id) do update
  set role = 'admin',
      permissions = jsonb_build_object(
        'chats', true,
        'follow-ups', true,
        'kanban', true,
        'contacts', true,
        'label_filters', jsonb_build_object()
      );

  -- Crear o actualizar la suscripción con plan business
  -- trial_ends_at es NOT NULL, así que usamos una fecha futura (1 año desde ahora)
  -- trial_started_at también es NOT NULL, así que usamos now()
  insert into public.subscriptions (
    user_id,
    plan_id,
    status,
    trial_started_at,
    trial_ends_at
  )
  values (
    p_user_id,
    'business',
    'active',
    now(),
    now() + interval '1 year' -- Fecha futura para planes no-trial
  )
  on conflict (user_id) do update
  set plan_id = 'business',
      status = 'active',
      trial_ends_at = now() + interval '1 year';

  return v_team_id;
end;
$$;

revoke all on function public.create_business_team_for_user(uuid) from public;
grant execute on function public.create_business_team_for_user(uuid) to authenticated;

-- Comentarios
comment on function public.get_user_team_info() is 'Obtiene información del equipo del usuario actual (sin parámetros)';
comment on function public.get_user_team_info_with_permissions(uuid) is 'Obtiene información del equipo de un usuario específico con permisos y perfil';
comment on function public.create_business_team_for_user(uuid) is 'Crea un equipo business para un usuario y lo agrega como admin';

