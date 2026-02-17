-- ============================================
-- Funciones para optimización de etiquetas "ignorar" en masa
-- ============================================

-- Función para agregar/quitar etiqueta "ignorar" en masa
create or replace function public.bulk_update_ignore_label(
  p_user_id uuid,
  p_should_ignore boolean,
  p_label_filter text[] default null,
  p_search_term text default null
)
returns table(updated_count bigint)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_query text;
  v_where_clauses text[] := array[]::text[];
  v_updated_count bigint;
  v_ignore_label_name text;
begin
  -- Obtener el nombre canónico de la etiqueta "ignorar" del usuario
  -- Busca la etiqueta en la tabla labels, prefiriendo mayúscula inicial
  select name into v_ignore_label_name
  from public.labels
  where user_id = p_user_id
    and lower(trim(name)) = 'ignorar'
  order by 
    case when name ~ '^[A-Z]' then 0 else 1 end, -- Preferir mayúscula inicial
    created_at
  limit 1;
  
  -- Si no existe la etiqueta, usar 'Ignorar' (Title Case) como valor por defecto
  if v_ignore_label_name is null then
    v_ignore_label_name := 'Ignorar';
  end if;
  
  -- Construir condiciones WHERE
  v_where_clauses := array_append(v_where_clauses, format('user_id = %L', p_user_id));
  
  -- Filtro por etiquetas si se proporciona
  -- Este filtro se usa para limitar los contactos visibles (ej: "humano" o "Ignorar")
  -- Cuando se activa (quitar "ignorar"), necesitamos contactos que tengan el filtro Y "Ignorar"
  -- Cuando se desactiva (agregar "ignorar"), necesitamos contactos que tengan el filtro pero NO "Ignorar"
  -- Buscar case-insensitive para manejar diferentes capitalizaciones
  if p_label_filter is not null and array_length(p_label_filter, 1) > 0 then
    v_where_clauses := array_append(v_where_clauses, format(
      'exists (
        select 1 from unnest(coalesce(labels, array[]::text[])) as lbl
        where lower(trim(lbl)) = any(
          select lower(trim(unnest)) from unnest(%L::text[])
        )
      )',
      p_label_filter
    ));
  end if;
  
  -- Filtro por búsqueda si se proporciona
  if p_search_term is not null and length(trim(p_search_term)) > 0 then
    v_where_clauses := array_append(v_where_clauses, format('(full_name ilike %L or phone_number ilike %L)', 
      '%' || p_search_term || '%', '%' || p_search_term || '%'));
  end if;
  
  -- Construir y ejecutar la actualización
  if p_should_ignore then
    -- Agregar etiqueta "ignorar" si no existe (case-insensitive)
    -- Procesa todos los contactos que coinciden con los filtros, agregando el nombre canónico solo si no la tienen
    v_query := format('
      update public.contacts
      set labels = case
        when not exists(
          select 1 from unnest(coalesce(labels, array[]::text[])) as label
          where lower(trim(label)) = ''ignorar''
        ) then array_append(coalesce(labels, array[]::text[]), %L)
        else labels
      end
      where %s
        and not exists(
          select 1 from unnest(coalesce(labels, array[]::text[])) as label
          where lower(trim(label)) = ''ignorar''
        )
    ', v_ignore_label_name, array_to_string(v_where_clauses, ' and '));
  else
    -- Quitar etiqueta "ignorar" si existe (case-insensitive)
    -- Solo procesa contactos que tienen "ignorar" (en cualquier variación) Y coinciden con los filtros
    -- Si hay un filtro de etiqueta (ej: "humano"), busca contactos con "humano" Y "ignorar"
    -- Si no hay filtro, busca solo contactos con "ignorar"
    v_query := format('
      update public.contacts
      set labels = array(
        select unnest
        from unnest(coalesce(labels, array[]::text[])) as unnest
        where lower(trim(unnest)) != ''ignorar''
      )
      where %s
        and exists(
          select 1 from unnest(coalesce(labels, array[]::text[])) as label
          where lower(trim(label)) = ''ignorar''
        )
    ', array_to_string(v_where_clauses, ' and '));
  end if;
  
  execute v_query;
  get diagnostics v_updated_count = row_count;
  
  return query select v_updated_count;
end;
$$;

revoke all on function public.bulk_update_ignore_label(uuid, boolean, text[], text) from public;
grant execute on function public.bulk_update_ignore_label(uuid, boolean, text[], text) to authenticated;

-- ============================================
-- Funciones para Plan Business - Gestión de vendedores
-- ============================================

-- Función para configurar etiqueta y permisos después de crear un usuario vendedor
-- Nota: El usuario debe ser creado primero usando Supabase Auth API
create or replace function public.setup_advisor_user(
  p_team_id uuid,
  p_user_id uuid,
  p_full_name text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner_id uuid;
  v_normalized_label_name text;
  v_label_exists boolean;
  v_label_id uuid;
begin
  -- Verificar que el usuario que llama es admin del equipo
  if not exists(
    select 1 from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.role = 'admin'
  ) then
    raise exception 'No tienes permisos para configurar usuarios en este equipo';
  end if;
  
  -- Obtener el owner del equipo
  select owner_id into v_owner_id
  from public.teams
  where id = p_team_id;
  
  if v_owner_id is null then
    raise exception 'Equipo no encontrado';
  end if;
  
  -- Normalizar nombre para etiqueta (minúsculas, sin espacios extra)
  v_normalized_label_name := lower(trim(p_full_name));
  
  -- Verificar si la etiqueta ya existe (del owner del equipo)
  select exists(
    select 1 from public.labels
    where user_id = v_owner_id
      and lower(name) = v_normalized_label_name
  ) into v_label_exists;
  
  -- Crear etiqueta si no existe
  if not v_label_exists then
    insert into public.labels (user_id, name, color, is_automated)
    values (
      v_owner_id,
      p_full_name, -- Usar el nombre original, no normalizado
      '#3B82F6', -- Color azul por defecto
      false
    )
    returning id into v_label_id;
  else
    -- Obtener el ID de la etiqueta existente
    select id into v_label_id
    from public.labels
    where user_id = v_owner_id
      and lower(name) = v_normalized_label_name
    limit 1;
  end if;
  
  -- Agregar usuario al equipo como advisor
  insert into public.team_members (team_id, user_id, role, permissions)
  values (
    p_team_id,
    p_user_id,
    'advisor',
    jsonb_build_object(
      'chats', true,
      'follow-ups', true,
      'kanban', true,
      'contacts', false, -- Por defecto no puede ver contactos
      'label_filters', jsonb_build_object(
        'contacts', jsonb_build_array(p_full_name),
        'chats', jsonb_build_array(p_full_name)
      )
    )
  )
  on conflict (team_id, user_id) do update
  set permissions = jsonb_build_object(
    'chats', true,
    'follow-ups', true,
    'kanban', true,
    'contacts', false,
    'label_filters', jsonb_build_object(
      'contacts', jsonb_build_array(p_full_name),
      'chats', jsonb_build_array(p_full_name)
    )
  );
end;
$$;

revoke all on function public.setup_advisor_user(uuid, uuid, text) from public;
grant execute on function public.setup_advisor_user(uuid, uuid, text) to authenticated;

-- Función para sincronizar nombre de vendedor con etiqueta
create or replace function public.sync_advisor_name_to_label(
  p_user_id uuid,
  p_new_name text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_team_id uuid;
  v_owner_id uuid;
  v_old_name text;
  v_label_id uuid;
begin
  -- Obtener el equipo del usuario
  select tm.team_id, t.owner_id
  into v_team_id, v_owner_id
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = p_user_id
    and tm.role = 'advisor'
  limit 1;
  
  if v_team_id is null then
    return; -- No es un vendedor o no está en un equipo
  end if;
  
  -- Obtener el nombre anterior del perfil
  select full_name into v_old_name
  from public.profiles
  where id = p_user_id;
  
  -- Buscar la etiqueta con el nombre anterior
  if v_old_name is not null and v_old_name != '' then
    select id into v_label_id
    from public.labels
    where user_id = v_owner_id
      and lower(name) = lower(trim(v_old_name))
    limit 1;
    
    -- Si existe la etiqueta, actualizarla
    if v_label_id is not null then
      update public.labels
      set name = p_new_name,
          updated_at = now()
      where id = v_label_id;
      
      -- Actualizar los contactos que tienen esta etiqueta
      update public.contacts
      set labels = array(
        select case when unnest = v_old_name then p_new_name else unnest end
        from unnest(labels)
      )
      where user_id = v_owner_id
        and labels && array[v_old_name]::text[];
    else
      -- Si no existe, crear una nueva etiqueta
      insert into public.labels (user_id, name, color, is_automated)
      values (v_owner_id, p_new_name, '#3B82F6', false)
      on conflict (user_id, name) do update
      set name = p_new_name,
          updated_at = now();
    end if;
  else
    -- Si no había nombre anterior, crear nueva etiqueta
    insert into public.labels (user_id, name, color, is_automated)
    values (v_owner_id, p_new_name, '#3B82F6', false)
    on conflict (user_id, name) do update
    set name = p_new_name,
        updated_at = now();
  end if;
  
  -- Actualizar los permisos del vendedor para usar el nuevo nombre en los filtros
  update public.team_members
  set permissions = jsonb_set(
    jsonb_set(
      permissions,
      '{label_filters,contacts}',
      jsonb_build_array(p_new_name)
    ),
    '{label_filters,chats}',
    jsonb_build_array(p_new_name)
  )
  where team_id = v_team_id
    and user_id = p_user_id
    and role = 'advisor';
end;
$$;

revoke all on function public.sync_advisor_name_to_label(uuid, text) from public;
grant execute on function public.sync_advisor_name_to_label(uuid, text) to authenticated;

-- Trigger para sincronizar automáticamente cuando cambia el nombre de un vendedor
create or replace function public.trigger_sync_advisor_name()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Solo sincronizar si el nombre cambió y el usuario es un advisor
  if tg_op = 'UPDATE' and (old.full_name is distinct from new.full_name) then
    if exists(
      select 1 from public.team_members
      where user_id = new.id
        and role = 'advisor'
    ) then
      perform public.sync_advisor_name_to_label(new.id, new.full_name);
    end if;
  end if;
  
  return new;
end;
$$;

-- Crear el trigger si no existe
drop trigger if exists sync_advisor_name_on_profile_update on public.profiles;
create trigger sync_advisor_name_on_profile_update
  after update of full_name on public.profiles
  for each row
  execute function public.trigger_sync_advisor_name();

-- ============================================
-- Configuración de límites de advisors por plan
-- ============================================

-- Agregar columna max_advisors a la tabla plans si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'plans' 
    AND column_name = 'max_advisors'
  ) THEN
    ALTER TABLE public.plans ADD COLUMN max_advisors INTEGER DEFAULT 2;
  END IF;
END $$;

-- Actualizar plan business para tener 2 advisors por defecto
UPDATE public.plans 
SET max_advisors = 2 
WHERE id = 'business';

-- Si el plan business no existe, crearlo (opcional, ajusta según tu caso)
-- INSERT INTO public.plans (id, name, max_advisors, features)
-- VALUES ('business', 'Business', 2, '{"multi_user": true}'::jsonb)
-- ON CONFLICT (id) DO UPDATE SET max_advisors = 2;

-- ============================================
-- Función optimizada para filtrar contactos con etiquetas case-insensitive
-- ============================================
-- Esta función permite filtrar contactos por etiquetas de forma case-insensitive
-- y con paginación, optimizada para miles de contactos

create or replace function public.get_filtered_contacts(
  p_user_id uuid,
  p_label_filter text[] default null,
  p_search_term text default null,
  p_sort_column text default 'created_at',
  p_sort_direction text default 'desc',
  p_page_number integer default 1,
  p_page_size integer default 50,
  p_restricted_labels text[] default null
)
returns table(
  contacts jsonb,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_query text;
  v_where_clauses text[] := array[]::text[];
  v_order_clause text;
  v_offset integer;
  v_limit integer;
  v_total_count bigint;
  v_contacts_result jsonb;
begin
  -- Construir condiciones WHERE
  v_where_clauses := array_append(v_where_clauses, format('user_id = %L', p_user_id));
  
  -- Filtro por etiquetas (case-insensitive)
  if p_label_filter is not null and array_length(p_label_filter, 1) > 0 then
    v_where_clauses := array_append(v_where_clauses, format(
      'exists (
        select 1 from unnest(coalesce(labels, array[]::text[])) as lbl
        where lower(trim(lbl)) = any(
          select lower(trim(unnest)) from unnest(%L::text[])
        )
      )',
      p_label_filter
    ));
  end if;
  
  -- Filtro por búsqueda (nombre o teléfono)
  if p_search_term is not null and length(trim(p_search_term)) > 0 then
    v_where_clauses := array_append(v_where_clauses, format(
      '(full_name ilike %L or phone_number ilike %L)',
      '%' || p_search_term || '%',
      '%' || p_search_term || '%'
    ));
  end if;
  
  -- Filtro por etiquetas restringidas (para advisors)
  if p_restricted_labels is not null and array_length(p_restricted_labels, 1) > 0 then
    v_where_clauses := array_append(v_where_clauses, format(
      'labels && %L::text[]',
      p_restricted_labels
    ));
  end if;
  
  -- Construir cláusula ORDER BY
  -- Validar que la columna de ordenamiento sea segura
  if p_sort_column not in ('created_at', 'full_name', 'phone_number') then
    p_sort_column := 'created_at';
  end if;
  
  if upper(p_sort_direction) not in ('ASC', 'DESC') then
    p_sort_direction := 'DESC';
  end if;
  
  v_order_clause := format('%I %s', p_sort_column, upper(p_sort_direction));
  
  -- Calcular offset y limit
  v_offset := (p_page_number - 1) * p_page_size;
  v_limit := p_page_size;
  
  -- Obtener el total de contactos que coinciden (sin paginación)
  execute format('
    select count(*)::bigint
    from public.contacts
    where %s
  ', array_to_string(v_where_clauses, ' and '))
  into v_total_count;
  
  -- Obtener los contactos paginados
  execute format('
    select jsonb_agg(row_to_json(t))
    from (
      select 
        id,
        full_name,
        phone_number,
        created_at,
        labels,
        razon_de_label_auto
      from public.contacts
      where %s
      order by %s
      limit %s offset %s
    ) t
  ', 
    array_to_string(v_where_clauses, ' and '),
    v_order_clause,
    v_limit,
    v_offset
  )
  into v_contacts_result;
  
  -- Retornar resultados
  return query select 
    coalesce(v_contacts_result, '[]'::jsonb) as contacts,
    v_total_count as total_count;
end;
$$;

revoke all on function public.get_filtered_contacts(uuid, text[], text, text, text, integer, integer, text[]) from public;
grant execute on function public.get_filtered_contacts(uuid, text[], text, text, text, integer, integer, text[]) to authenticated;

-- ============================================
-- Tabla de Promociones Inteligentes
-- ============================================
-- Promos Inteligentes para inserción contextual en conversaciones
create table if not exists public.smart_promotions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    benefits text,
    call_to_action text,
    image_urls text[] default '{}',
    start_at timestamptz,
    end_at timestamptz,
    no_schedule boolean default false,
    is_active boolean default true,
    auto_insert boolean default true,
    max_mentions_per_day int default 3,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    last_triggered_at timestamptz,
    trigger_count int default 0
);

create index if not exists smart_promotions_user_idx on public.smart_promotions (user_id, is_active, start_at);

create or replace trigger trg_smart_promotions_updated_at
    before update on public.smart_promotions
    for each row
    execute function public.set_updated_at();

-- RLS Policies para smart_promotions
alter table public.smart_promotions enable row level security;

-- Policy: Los usuarios solo pueden ver sus propias promociones
create policy "Users can view their own smart promotions"
    on public.smart_promotions
    for select
    using (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden insertar sus propias promociones
create policy "Users can insert their own smart promotions"
    on public.smart_promotions
    for insert
    with check (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden actualizar sus propias promociones
create policy "Users can update their own smart promotions"
    on public.smart_promotions
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden eliminar sus propias promociones
create policy "Users can delete their own smart promotions"
    on public.smart_promotions
    for delete
    using (auth.uid() = user_id);

-- ============================================
-- Tabla de Estados de Conversación (para detección crítica)
-- ============================================
-- Tabla para gestionar estado de conversaciones (pausa/reanudación)
create table if not exists public.conversation_states (
    id bigint generated always as identity primary key,
    contact_id bigint not null references public.contacts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    is_paused boolean default false,
    pause_reason text, -- 'human_request', 'critical_intent', 'sensitive_label', etc.
    paused_at timestamptz,
    paused_by uuid references auth.users(id), -- null si fue automático
    resumed_at timestamptz,
    resumed_by uuid references auth.users(id),
    metadata jsonb default '{}', -- Detalles adicionales (intención detectada, etiqueta, etc.)
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null,
    unique(contact_id) -- Un solo estado activo por contacto
);

create index if not exists conversation_states_contact_idx on public.conversation_states (contact_id);
create index if not exists conversation_states_user_idx on public.conversation_states (user_id, is_paused);
create index if not exists conversation_states_paused_idx on public.conversation_states (is_paused, paused_at) where is_paused = true;

-- Trigger para actualizar updated_at
create or replace trigger trg_conversation_states_updated_at
    before update on public.conversation_states
    for each row
    execute function public.set_updated_at();

-- RLS Policies para conversation_states
alter table public.conversation_states enable row level security;

-- Policy: Los usuarios solo pueden ver estados de sus propios contactos
create policy "Users can view conversation states of their contacts"
    on public.conversation_states
    for select
    using (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden insertar estados para sus propios contactos
create policy "Users can insert conversation states for their contacts"
    on public.conversation_states
    for insert
    with check (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden actualizar estados de sus propios contactos
create policy "Users can update conversation states of their contacts"
    on public.conversation_states
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden eliminar estados de sus propios contactos
create policy "Users can delete conversation states of their contacts"
    on public.conversation_states
    for delete
    using (auth.uid() = user_id);

