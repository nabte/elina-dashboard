-- ============================================
-- Funciones RPC para Grupos de WhatsApp
-- ============================================

-- Función para obtener grupos recientes con último mensaje
-- Similar a get_recent_contacts pero para grupos
create or replace function public.get_recent_groups()
returns table (
    group_id bigint,
    group_jid text,
    group_name text,
    group_description text,
    participant_count integer,
    last_message_at timestamptz,
    last_message_content text,
    last_message_sender text,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    return query
    select 
        g.id as group_id,
        g.group_jid,
        g.group_name,
        g.group_description,
        g.participant_count,
        g.last_message_at,
        coalesce(m.content, '') as last_message_content,
        coalesce(m.sender_name, '') as last_message_sender,
        g.created_at
    from public.whatsapp_groups g
    left join lateral (
        select content, sender_name
        from public.group_chat_history m
        where m.group_id = g.id
        order by m.created_at desc
        limit 1
    ) m on true
    where g.user_id = auth.uid()
        and g.is_archived = false
    order by g.last_message_at desc nulls last, g.created_at desc;
end;
$$;

-- Otorgar permisos de ejecución
grant execute on function public.get_recent_groups() to authenticated;

-- Función para obtener información detallada de un grupo
create or replace function public.get_group_details(p_group_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_result jsonb;
begin
    select jsonb_build_object(
        'id', g.id,
        'group_jid', g.group_jid,
        'group_name', g.group_name,
        'group_description', g.group_description,
        'participants', g.group_participants,
        'admins', g.group_admins,
        'participant_count', g.participant_count,
        'is_archived', g.is_archived,
        'last_message_at', g.last_message_at,
        'created_at', g.created_at,
        'updated_at', g.updated_at
    ) into v_result
    from public.whatsapp_groups g
    where g.id = p_group_id
        and g.user_id = auth.uid();
    
    return v_result;
end;
$$;

grant execute on function public.get_group_details(bigint) to authenticated;

-- Función para verificar si un usuario es administrador de un grupo
create or replace function public.is_group_admin(p_group_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_user_phone text;
    v_group_admins jsonb;
    v_is_admin boolean := false;
begin
    -- Obtener el número de teléfono del usuario desde su perfil
    select phone_number into v_user_phone
    from public.profiles
    where id = auth.uid();
    
    if v_user_phone is null then
        return false;
    end if;
    
    -- Normalizar el número (quitar + y espacios)
    v_user_phone := replace(replace(v_user_phone, '+', ''), ' ', '');
    
    -- Obtener lista de administradores del grupo
    select group_admins into v_group_admins
    from public.whatsapp_groups
    where id = p_group_id
        and user_id = auth.uid();
    
    if v_group_admins is null or jsonb_array_length(v_group_admins) = 0 then
        return false;
    end if;
    
    -- Verificar si el JID del usuario está en la lista de administradores
    -- Los JIDs de administradores pueden venir como números o como JIDs completos
    select exists (
        select 1
        from jsonb_array_elements_text(v_group_admins) as admin_jid
        where admin_jid like '%' || v_user_phone || '%'
            or admin_jid = v_user_phone || '@s.whatsapp.net'
    ) into v_is_admin;
    
    return v_is_admin;
end;
$$;

grant execute on function public.is_group_admin(bigint) to authenticated;

