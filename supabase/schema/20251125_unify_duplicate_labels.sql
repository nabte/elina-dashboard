-- ============================================
-- Unificar Etiquetas Duplicadas
-- ============================================
-- Este script unifica etiquetas duplicadas que solo difieren en capitalización
-- Ejemplo: "No responde", "no responde", "NO RESPONDE" → "No responde"
--          "nuevo cliente", "Nuevo cliente", "NUEVO CLIENTE" → "Nuevo cliente"
--          "ignorar", "Ignorar", "IGNORAR" → "Ignorar"

-- Función helper para normalizar nombre a Title Case (primera mayúscula, resto minúsculas)
create or replace function public.normalize_label_name_to_title_case(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_trimmed text;
begin
  if p_name is null then
    return null;
  end if;
  
  -- Eliminar espacios al inicio y final
  v_trimmed := trim(p_name);
  
  if v_trimmed = '' then
    return null;
  end if;
  
  -- Normalizar: primera letra mayúscula, resto minúsculas
  -- Manejar casos especiales como palabras de una sola letra
  if length(v_trimmed) = 1 then
    return upper(v_trimmed);
  end if;
  
  return upper(left(v_trimmed, 1)) || lower(substring(v_trimmed from 2));
end;
$$;

-- Función para normalizar TODAS las etiquetas de un usuario a Title Case
create or replace function public.normalize_all_labels_to_title_case(p_user_id uuid)
returns table(
  normalized_count bigint,
  normalized_labels jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_label record;
  v_normalized_name text;
  v_updated_count bigint := 0;
  v_result jsonb := '[]'::jsonb;
begin
  -- Normalizar todas las etiquetas del usuario a Title Case
  for v_label in
    select id, name
    from public.labels
    where user_id = p_user_id
      and name != public.normalize_label_name_to_title_case(name) -- Solo las que necesitan normalización
  loop
    v_normalized_name := public.normalize_label_name_to_title_case(v_label.name);
    
    -- Actualizar la etiqueta en la tabla labels
    update public.labels
    set name = v_normalized_name,
        updated_at = now()
    where id = v_label.id;
    
    -- Actualizar todos los contactos que tienen esta etiqueta (manejar espacios al final)
    update public.contacts
    set labels = array(
      select case 
        when lower(trim(unnest)) = lower(trim(v_label.name))
        then v_normalized_name
        else trim(unnest) -- También limpiar espacios de otras etiquetas
      end
      from unnest(labels)
    ),
    updated_at = now()
    where user_id = p_user_id
      and (
        labels && array[v_label.name]::text[]
        or exists (
          select 1 from unnest(labels) as lbl
          where lower(trim(lbl)) = lower(trim(v_label.name))
        )
      );
    
    v_updated_count := v_updated_count + 1;
    v_result := v_result || jsonb_build_object(
      'old_name', v_label.name,
      'new_name', v_normalized_name
    );
  end loop;
  
  return query select 
    v_updated_count as normalized_count,
    v_result as normalized_labels;
end;
$$;

-- Función para unificar etiquetas duplicadas de un usuario
create or replace function public.unify_duplicate_labels(p_user_id uuid)
returns table(
  unified_count bigint,
  merged_labels jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_duplicate_group record;
  v_canonical_name text;
  v_canonical_id uuid;
  v_duplicate_names text[];
  v_merged_count bigint := 0;
  v_result jsonb := '[]'::jsonb;
begin
  -- Encontrar grupos de etiquetas duplicadas (mismo nombre normalizado)
  for v_duplicate_group in
    select 
      lower(trim(name)) as normalized_name,
      array_agg(DISTINCT name ORDER BY name) as name_variations,
      array_agg(id ORDER BY created_at) as label_ids,
      min(created_at) as oldest_created_at
    from public.labels
    where user_id = p_user_id
    group by lower(trim(name))
    having count(DISTINCT name) > 1
  loop
    -- Usar siempre Title Case como nombre canónico
    v_canonical_name := public.normalize_label_name_to_title_case(v_duplicate_group.normalized_name);
    
    -- Verificar si ya existe una etiqueta con el nombre canónico
    select id into v_canonical_id
    from public.labels
    where user_id = p_user_id
      and lower(trim(name)) = lower(trim(v_canonical_name))
    limit 1;
    
    -- Si no existe, crear la etiqueta canónica usando la más antigua
    if v_canonical_id is null then
      -- Obtener la etiqueta más antigua del grupo
      select id, name into v_canonical_id, v_canonical_name
      from public.labels
      where user_id = p_user_id
        and lower(trim(name)) = v_duplicate_group.normalized_name
      order by created_at
      limit 1;
      
      -- Actualizar su nombre a Title Case
      update public.labels
      set name = public.normalize_label_name_to_title_case(v_canonical_name),
          updated_at = now()
      where id = v_canonical_id;
      
      v_canonical_name := public.normalize_label_name_to_title_case(v_canonical_name);
    else
      -- Asegurar que la canónica esté en Title Case
      update public.labels
      set name = public.normalize_label_name_to_title_case(v_canonical_name),
          updated_at = now()
      where id = v_canonical_id;
      
      select name into v_canonical_name
      from public.labels
      where id = v_canonical_id;
    end if;
    
    -- Actualizar todos los contactos que tienen las variaciones duplicadas
    -- Reemplazar todas las variaciones con el nombre canónico
    for v_duplicate_names in
      select unnest(v_duplicate_group.name_variations)
      where lower(trim(unnest)) != lower(trim(v_canonical_name))
    loop
      update public.contacts
      set labels = array(
        select case 
          when lower(trim(unnest)) = lower(trim(v_duplicate_names)) 
          then v_canonical_name 
          else trim(unnest) -- Limpiar espacios de otras etiquetas también
        end
        from unnest(labels)
      ),
      updated_at = now()
      where user_id = p_user_id
        and (
          labels && array[v_duplicate_names]::text[]
          or exists (
            select 1 from unnest(labels) as lbl
            where lower(trim(lbl)) = lower(trim(v_duplicate_names))
          )
        );
      
      get diagnostics v_merged_count = row_count;
      v_merged_count := v_merged_count + v_merged_count;
    end loop;
    
    -- Eliminar las etiquetas duplicadas (mantener solo la canónica)
    delete from public.labels
    where user_id = p_user_id
      and lower(trim(name)) = v_duplicate_group.normalized_name
      and id != v_canonical_id;
    
    -- Agregar al resultado
    v_result := v_result || jsonb_build_object(
      'canonical_name', v_canonical_name,
      'merged_variations', v_duplicate_group.name_variations,
      'contacts_updated', v_merged_count
    );
  end loop;
  
  return query select 
    v_merged_count as unified_count,
    v_result as merged_labels;
end;
$$;

revoke all on function public.unify_duplicate_labels(uuid) from public;
grant execute on function public.unify_duplicate_labels(uuid) to authenticated;

-- Función para unificar etiquetas de todos los usuarios (solo para superadmin)
create or replace function public.unify_all_duplicate_labels()
returns table(
  user_id uuid,
  unified_count bigint,
  merged_labels jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user record;
begin
  for v_user in
    select distinct user_id from public.labels
  loop
    return query
    select 
      v_user.user_id,
      unified_count,
      merged_labels
    from public.unify_duplicate_labels(v_user.user_id);
  end loop;
end;
$$;

revoke all on function public.unify_all_duplicate_labels() from public;
grant execute on function public.unify_all_duplicate_labels() to authenticated;

-- Función helper para obtener el nombre canónico de una etiqueta
-- (usar siempre la versión que existe en la BD, normalizada)
create or replace function public.get_canonical_label_name(
  p_user_id uuid,
  p_label_name text
)
returns text
language sql
stable
as $$
  select name
  from public.labels
  where user_id = p_user_id
    and lower(trim(name)) = lower(trim(p_label_name))
  order by 
    case when name ~ '^[A-Z]' then 0 else 1 end,
    created_at
  limit 1;
$$;

revoke all on function public.get_canonical_label_name(uuid, text) from public;
grant execute on function public.get_canonical_label_name(uuid, text) to authenticated;

-- Función para normalizar y unificar todas las etiquetas de un usuario
create or replace function public.normalize_and_unify_all_labels(p_user_id uuid)
returns table(
  normalized_count bigint,
  unified_count bigint,
  result jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_normalized_result record;
  v_unified_result record;
begin
  -- Primero normalizar todas las etiquetas a Title Case
  select * into v_normalized_result
  from public.normalize_all_labels_to_title_case(p_user_id);
  
  -- Luego unificar duplicados
  select * into v_unified_result
  from public.unify_duplicate_labels(p_user_id);
  
  return query select 
    v_normalized_result.normalized_count,
    v_unified_result.unified_count,
    jsonb_build_object(
      'normalized', v_normalized_result.normalized_labels,
      'unified', v_unified_result.merged_labels
    ) as result;
end;
$$;

-- Función para normalizar y unificar etiquetas de TODOS los usuarios
create or replace function public.normalize_and_unify_all_labels_all_users()
returns table(
  user_id uuid,
  normalized_count bigint,
  unified_count bigint,
  result jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user record;
begin
  for v_user in
    select distinct user_id from public.labels
  loop
    return query
    select 
      v_user.user_id,
      normalized_count,
      unified_count,
      result
    from public.normalize_and_unify_all_labels(v_user.user_id);
  end loop;
end;
$$;

revoke all on function public.normalize_label_name_to_title_case(text) from public;
grant execute on function public.normalize_label_name_to_title_case(text) to authenticated;

revoke all on function public.normalize_all_labels_to_title_case(uuid) from public;
grant execute on function public.normalize_all_labels_to_title_case(uuid) to authenticated;

revoke all on function public.normalize_and_unify_all_labels(uuid) from public;
grant execute on function public.normalize_and_unify_all_labels(uuid) to authenticated;

revoke all on function public.normalize_and_unify_all_labels_all_users() from public;
grant execute on function public.normalize_and_unify_all_labels_all_users() to authenticated;

-- Trigger para normalizar y prevenir duplicados al insertar
create or replace function public.prevent_duplicate_label_insert()
returns trigger
language plpgsql
as $$
declare
  v_existing_id uuid;
  v_existing_name text;
  v_normalized_name text;
begin
  -- Normalizar el nombre a Title Case
  v_normalized_name := public.normalize_label_name_to_title_case(new.name);
  new.name := v_normalized_name;
  
  -- Buscar si ya existe una etiqueta con el mismo nombre normalizado
  select id, name into v_existing_id, v_existing_name
  from public.labels
  where user_id = new.user_id
    and lower(trim(name)) = lower(trim(v_normalized_name))
  limit 1;
  
  if v_existing_id is not null then
    -- Si existe, usar la existente (evitar duplicado)
    raise exception 'Ya existe una etiqueta con el nombre "%" (normalizado: "%")', v_existing_name, v_normalized_name
      using errcode = '23505';
  end if;
  
  return new;
end;
$$;

-- Crear trigger si no existe
drop trigger if exists trg_prevent_duplicate_label_insert on public.labels;
create trigger trg_prevent_duplicate_label_insert
  before insert on public.labels
  for each row
  execute function public.prevent_duplicate_label_insert();

-- ============================================
-- EJECUTAR NORMALIZACIÓN Y UNIFICACIÓN PARA TODOS LOS USUARIOS
-- ============================================
-- Descomenta la siguiente línea para ejecutar la normalización y unificación automáticamente
-- Esto normalizará todas las etiquetas a Title Case y unificará duplicados
-- SELECT * FROM public.normalize_and_unify_all_labels_all_users();

-- O para un usuario específico:
-- SELECT * FROM public.normalize_and_unify_all_labels('USER_ID_AQUI');

