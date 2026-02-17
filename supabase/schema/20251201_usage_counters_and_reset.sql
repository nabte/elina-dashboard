-- ============================================
-- Sistema de Contadores de Uso y Reset Mensual
-- ============================================
-- Este archivo crea las funciones para incrementar los contadores de uso
-- y un sistema de reset mensual automático

-- ============================================
-- Función para incrementar uso de texto (AI Enhancements)
-- ============================================
-- Primero eliminar la función existente si tiene un tipo de retorno diferente
drop function if exists public.increment_text_usage(uuid);

create or replace function public.increment_text_usage(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit int;
  v_used int;
  v_result jsonb;
begin
  -- Obtener límite y uso actual
  select 
    p.ai_enhancements_limit,
    pr.ai_enhancements_used
  into v_limit, v_used
  from public.profiles pr
  left join public.subscriptions s on s.user_id = pr.id
  left join public.plans p on p.id = s.plan_id
  where pr.id = p_user_id;
  
  -- Si no se encuentra el usuario, retornar error
  if v_used is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Usuario no encontrado'
    );
  end if;
  
  -- Verificar si se ha alcanzado el límite
  if v_limit > 0 and v_used >= v_limit then
    return jsonb_build_object(
      'success', false,
      'message', 'Has alcanzado tu límite de mejoras de texto para este mes'
    );
  end if;
  
  -- Incrementar el contador
  update public.profiles
  set ai_enhancements_used = ai_enhancements_used + 1
  where id = p_user_id;
  
  -- Retornar éxito
  return jsonb_build_object(
    'success', true,
    'message', 'Uso incrementado correctamente',
    'used', v_used + 1,
    'limit', v_limit
  );
end;
$$;

revoke all on function public.increment_text_usage(uuid) from public;
grant execute on function public.increment_text_usage(uuid) to authenticated;

-- ============================================
-- Función para incrementar uso de imágenes
-- ============================================
-- Primero eliminar la función existente si tiene un tipo de retorno diferente
drop function if exists public.increment_image_usage(uuid);

create or replace function public.increment_image_usage(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit int;
  v_used int;
  v_result jsonb;
begin
  -- Obtener límite y uso actual
  select 
    p.image_generations_limit,
    pr.image_generations_used
  into v_limit, v_used
  from public.profiles pr
  left join public.subscriptions s on s.user_id = pr.id
  left join public.plans p on p.id = s.plan_id
  where pr.id = p_user_id;
  
  -- Si no se encuentra el usuario, retornar error
  if v_used is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Usuario no encontrado'
    );
  end if;
  
  -- Verificar si se ha alcanzado el límite
  if v_limit > 0 and v_used >= v_limit then
    return jsonb_build_object(
      'success', false,
      'message', 'Has alcanzado tu límite de generaciones de imágenes para este mes'
    );
  end if;
  
  -- Incrementar el contador
  update public.profiles
  set image_generations_used = image_generations_used + 1
  where id = p_user_id;
  
  -- Retornar éxito
  return jsonb_build_object(
    'success', true,
    'message', 'Uso incrementado correctamente',
    'used', v_used + 1,
    'limit', v_limit
  );
end;
$$;

revoke all on function public.increment_image_usage(uuid) from public;
grant execute on function public.increment_image_usage(uuid) to authenticated;

-- ============================================
-- Función para incrementar uso de videos
-- ============================================
-- Primero eliminar la función existente si tiene un tipo de retorno diferente
drop function if exists public.increment_video_usage(uuid);

create or replace function public.increment_video_usage(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit int;
  v_used int;
  v_result jsonb;
begin
  -- Obtener límite y uso actual
  select 
    p.video_generations_limit,
    pr.video_generations_used
  into v_limit, v_used
  from public.profiles pr
  left join public.subscriptions s on s.user_id = pr.id
  left join public.plans p on p.id = s.plan_id
  where pr.id = p_user_id;
  
  -- Si no se encuentra el usuario, retornar error
  if v_used is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Usuario no encontrado'
    );
  end if;
  
  -- Verificar si se ha alcanzado el límite
  if v_limit > 0 and v_used >= v_limit then
    return jsonb_build_object(
      'success', false,
      'message', 'Has alcanzado tu límite de generaciones de video para este mes'
    );
  end if;
  
  -- Incrementar el contador
  update public.profiles
  set video_generations_used = video_generations_used + 1
  where id = p_user_id;
  
  -- Retornar éxito
  return jsonb_build_object(
    'success', true,
    'message', 'Uso incrementado correctamente',
    'used', v_used + 1,
    'limit', v_limit
  );
end;
$$;

revoke all on function public.increment_video_usage(uuid) from public;
grant execute on function public.increment_video_usage(uuid) to authenticated;

-- ============================================
-- Función para resetear contadores mensualmente
-- ============================================
create or replace function public.reset_monthly_usage_counters()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Resetear todos los contadores de uso a 0
  -- Esta función debe ejecutarse el primer día de cada mes
  update public.profiles
  set 
    ai_enhancements_used = 0,
    image_generations_used = 0,
    video_generations_used = 0,
    ai_enhancements_reset_at = timezone('utc', now())
  where 
    ai_enhancements_used > 0 
    or image_generations_used > 0 
    or video_generations_used > 0;
end;
$$;

revoke all on function public.reset_monthly_usage_counters() from public;
grant execute on function public.reset_monthly_usage_counters() to service_role;

-- ============================================
-- Función helper para verificar si es el primer día del mes
-- ============================================
create or replace function public.should_reset_counters()
returns boolean
language plpgsql
as $$
begin
  -- Retorna true si es el primer día del mes
  return extract(day from timezone('utc', now())) = 1;
end;
$$;

-- ============================================
-- Comentarios para documentación
-- ============================================
comment on function public.increment_text_usage(uuid) is 'Incrementa el contador de mejoras de texto (AI enhancements) del usuario';
comment on function public.increment_image_usage(uuid) is 'Incrementa el contador de generaciones de imágenes del usuario';
comment on function public.increment_video_usage(uuid) is 'Incrementa el contador de generaciones de video del usuario';
comment on function public.reset_monthly_usage_counters() is 'Resetea todos los contadores de uso a 0. Debe ejecutarse el primer día de cada mes mediante un cron job o pg_cron';
comment on function public.should_reset_counters() is 'Helper function que verifica si es el primer día del mes para resetear contadores';

