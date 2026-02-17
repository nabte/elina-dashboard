-- ============================================
-- Sistema de Grupos de WhatsApp
-- ============================================
-- Este sistema permite gestionar grupos de WhatsApp usando Evolution API
-- Los grupos tienen JID que termina en @g.us (vs @s.whatsapp.net para contactos)

-- Tabla principal de grupos de WhatsApp
create table if not exists public.whatsapp_groups (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    group_jid text not null, -- ID del grupo en WhatsApp (ej: 120363123456789012@g.us)
    group_name text not null,
    group_description text,
    group_participants jsonb default '[]'::jsonb, -- Array de participantes: [{"jid": "...", "name": "...", "is_admin": false}]
    group_admins jsonb default '[]'::jsonb, -- Array de JIDs de administradores
    participant_count integer default 0,
    is_archived boolean default false,
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null,
    last_message_at timestamptz,
    unique(user_id, group_jid) -- Un grupo único por usuario
);

create index if not exists whatsapp_groups_user_idx on public.whatsapp_groups (user_id, last_message_at desc nulls last);
create index if not exists whatsapp_groups_jid_idx on public.whatsapp_groups (group_jid);
create index if not exists whatsapp_groups_archived_idx on public.whatsapp_groups (user_id, is_archived) where is_archived = false;

-- Trigger para actualizar updated_at
drop trigger if exists trg_whatsapp_groups_updated_at on public.whatsapp_groups;
create or replace trigger trg_whatsapp_groups_updated_at
    before update on public.whatsapp_groups
    for each row
    execute function public.set_updated_at();

-- Tabla de historial de mensajes de grupos
create table if not exists public.group_chat_history (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    group_id bigint not null references public.whatsapp_groups(id) on delete cascade,
    message_type text not null default 'human', -- 'human' o 'ai'
    content text not null,
    sender_jid text, -- JID del remitente (ej: 5211234567890@s.whatsapp.net)
    sender_name text, -- Nombre del remitente
    is_from_me boolean default false, -- Si el mensaje fue enviado por el usuario
    created_at timestamptz default timezone('utc', now()) not null
);

create index if not exists group_chat_history_group_idx on public.group_chat_history (group_id, created_at desc);
create index if not exists group_chat_history_user_idx on public.group_chat_history (user_id, created_at desc);
create index if not exists group_chat_history_sender_idx on public.group_chat_history (sender_jid);

-- Función para actualizar last_message_at cuando se inserta un mensaje en el grupo
create or replace function public.update_group_last_message_at()
returns trigger
language plpgsql
security definer
as $$
begin
    update public.whatsapp_groups
    set last_message_at = new.created_at
    where id = new.group_id;
    return new;
end;
$$;

-- Trigger para actualizar last_message_at automáticamente
drop trigger if exists trg_group_chat_history_update_last_message on public.group_chat_history;
create or replace trigger trg_group_chat_history_update_last_message
    after insert on public.group_chat_history
    for each row
    execute function public.update_group_last_message_at();

-- Habilitar RLS (Row Level Security)
alter table public.whatsapp_groups enable row level security;
alter table public.group_chat_history enable row level security;

-- Políticas RLS para whatsapp_groups
drop policy if exists "Users can view their own groups" on public.whatsapp_groups;
create policy "Users can view their own groups"
    on public.whatsapp_groups
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert their own groups" on public.whatsapp_groups;
create policy "Users can insert their own groups"
    on public.whatsapp_groups
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own groups" on public.whatsapp_groups;
create policy "Users can update their own groups"
    on public.whatsapp_groups
    for update
    using (auth.uid() = user_id);

drop policy if exists "Users can delete their own groups" on public.whatsapp_groups;
create policy "Users can delete their own groups"
    on public.whatsapp_groups
    for delete
    using (auth.uid() = user_id);

-- Políticas RLS para group_chat_history
drop policy if exists "Users can view their own group messages" on public.group_chat_history;
create policy "Users can view their own group messages"
    on public.group_chat_history
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert their own group messages" on public.group_chat_history;
create policy "Users can insert their own group messages"
    on public.group_chat_history
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own group messages" on public.group_chat_history;
create policy "Users can update their own group messages"
    on public.group_chat_history
    for update
    using (auth.uid() = user_id);

drop policy if exists "Users can delete their own group messages" on public.group_chat_history;
create policy "Users can delete their own group messages"
    on public.group_chat_history
    for delete
    using (auth.uid() = user_id);

