-- ============================================
-- Sistema de Detección Crítica en Tiempo Real
-- ============================================
-- Este sistema detecta intenciones críticas en mensajes entrantes
-- y pausa automáticamente la conversación con IA cuando se requiere atención humana

-- Tabla para gestionar estado de conversaciones
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
drop trigger if exists trg_conversation_states_updated_at on public.conversation_states;
create or replace trigger trg_conversation_states_updated_at
    before update on public.conversation_states
    for each row
    execute function public.set_updated_at();

-- Tabla para registrar detecciones críticas
create table if not exists public.critical_detections (
    id bigint generated always as identity primary key,
    contact_id bigint not null references public.contacts(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    message_id bigint references public.chat_history(id),
    detection_type text not null, -- 'human_request', 'purchase_intent', 'sensitive_label', 'custom_keyword'
    detected_content text not null, -- El contenido que disparó la detección
    confidence_score numeric(3,2), -- 0.00 a 1.00
    metadata jsonb default '{}', -- Detalles adicionales
    processed boolean default false,
    processed_at timestamptz,
    created_at timestamptz default timezone('utc', now()) not null
);

create index if not exists critical_detections_contact_idx on public.critical_detections (contact_id, created_at desc);
create index if not exists critical_detections_user_idx on public.critical_detections (user_id, processed);
create index if not exists critical_detections_type_idx on public.critical_detections (detection_type, processed);

-- Tabla para configurar palabras clave críticas por usuario
create table if not exists public.critical_keywords (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    keyword text not null,
    detection_type text not null default 'custom_keyword', -- 'human_request', 'purchase_intent', 'custom_keyword'
    is_active boolean default true,
    case_sensitive boolean default false,
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null,
    unique(user_id, keyword, detection_type)
);

create index if not exists critical_keywords_user_idx on public.critical_keywords (user_id, is_active);

drop trigger if exists trg_critical_keywords_updated_at on public.critical_keywords;
create or replace trigger trg_critical_keywords_updated_at
    before update on public.critical_keywords
    for each row
    execute function public.set_updated_at();

-- Función para detectar intenciones críticas en un mensaje
-- Primero eliminamos la función si existe para poder recrearla
drop function if exists public.detect_critical_intent(text, uuid, bigint);

create or replace function public.detect_critical_intent(
    p_message_content text,
    p_user_id uuid,
    p_contact_id bigint
) returns jsonb
language plpgsql
security definer
as $$
declare
    v_result jsonb := '{"is_critical": false, "detection_type": null, "confidence": 0.0}'::jsonb;
    v_keyword record;
    v_content_lower text;
    v_detected_type text;
    v_confidence numeric(3,2) := 0.0;
begin
    -- Normalizar contenido a minúsculas para búsqueda
    v_content_lower := lower(p_message_content);
    
    -- Patrones predefinidos para detección
    -- 1. Solicitud de humano
    if (v_content_lower ~* '(quiero|necesito|dame|hablar|atender|atenderme|persona|humano|agente|asesor|representante|operador|ejecutivo|vendedor|vendedora)' 
       and (v_content_lower ~* '(humano|persona|agente|asesor|representante|operador|ejecutivo|vendedor|vendedora|contigo|con alguien|con un|con una)' 
            or v_content_lower ~* '(no.*bot|no.*ia|no.*automatico|no.*automatica)'))
       or v_content_lower ~* '(quiero.*hablar.*alguien|necesito.*hablar.*alguien|dame.*contacto|hablar.*humano|atender.*humano|persona.*real)'
       or v_content_lower ~* '(hablar.*con.*alguien|hablar.*con.*un|hablar.*con.*una)' then
        v_detected_type := 'human_request';
        v_confidence := 0.9;
    -- 2. Intención de compra
    elsif v_content_lower ~* '(quiero|necesito|deseo|me interesa|me gustaria|me gustaría|estoy interesado|estoy interesada).*(comprar|adquirir|comprar|ordenar|pedir|contratar|suscribir|contrato|compra|adquisicion|adquisición)' then
        v_detected_type := 'purchase_intent';
        v_confidence := 0.85;
    -- 3. Urgencia o molestia
    elsif v_content_lower ~* '(urgente|inmediato|ahora|ya|molesto|molesta|enojado|enojada|frustrado|frustrada|problema|queja|reclamo|reclamar)' then
        v_detected_type := 'urgent_attention';
        v_confidence := 0.75;
    end if;
    
    -- Verificar palabras clave personalizadas del usuario
    for v_keyword in 
        select keyword, detection_type, case_sensitive
        from public.critical_keywords
        where user_id = p_user_id
          and is_active = true
    loop
        if v_keyword.case_sensitive then
            if p_message_content like '%' || v_keyword.keyword || '%' then
                v_detected_type := coalesce(v_keyword.detection_type, 'custom_keyword');
                v_confidence := greatest(v_confidence, 0.8);
                exit;
            end if;
        else
            if v_content_lower like '%' || lower(v_keyword.keyword) || '%' then
                v_detected_type := coalesce(v_keyword.detection_type, 'custom_keyword');
                v_confidence := greatest(v_confidence, 0.8);
                exit;
            end if;
        end if;
    end loop;
    
    -- Si se detectó algo crítico, construir resultado
    if v_detected_type is not null then
        v_result := jsonb_build_object(
            'is_critical', true,
            'detection_type', v_detected_type,
            'confidence', v_confidence,
            'detected_content', p_message_content
        );
    end if;
    
    return v_result;
end;
$$;

-- Función para pausar una conversación
-- Eliminar todas las versiones posibles de la función
drop function if exists public.pause_conversation(bigint, uuid, text, jsonb, uuid);
drop function if exists public.pause_conversation(bigint, uuid, text);
drop function if exists public.pause_conversation(bigint, uuid, text, jsonb);

create or replace function public.pause_conversation(
    p_contact_id bigint,
    p_user_id uuid,
    p_reason text,
    p_metadata jsonb default '{}'::jsonb,
    p_paused_by uuid default null
) returns bigint
language plpgsql
security definer
as $$
declare
    v_state_id bigint;
begin
    -- Insertar o actualizar estado
    insert into public.conversation_states (
        contact_id,
        user_id,
        is_paused,
        pause_reason,
        paused_at,
        paused_by,
        metadata
    )
    values (
        p_contact_id,
        p_user_id,
        true,
        p_reason,
        timezone('utc', now()),
        p_paused_by,
        p_metadata
    )
    on conflict (contact_id) 
    do update set
        is_paused = true,
        pause_reason = p_reason,
        paused_at = timezone('utc', now()),
        paused_by = p_paused_by,
        metadata = p_metadata,
        resumed_at = null,
        resumed_by = null,
        updated_at = timezone('utc', now())
    returning id into v_state_id;
    
    return v_state_id;
end;
$$;

-- Función para reanudar una conversación
-- Eliminar todas las versiones posibles de la función
drop function if exists public.resume_conversation(bigint, uuid);
drop function if exists public.resume_conversation(bigint);

create or replace function public.resume_conversation(
    p_contact_id bigint,
    p_resumed_by uuid
) returns boolean
language plpgsql
security definer
as $$
begin
    update public.conversation_states
    set is_paused = false,
        resumed_at = timezone('utc', now()),
        resumed_by = p_resumed_by,
        updated_at = timezone('utc', now())
    where contact_id = p_contact_id
      and is_paused = true;
    
    return found;
end;
$$;

-- Trigger que se dispara cuando se inserta un mensaje nuevo
-- IMPORTANTE: Eliminar el trigger primero porque depende de la función
drop trigger if exists trg_chat_history_critical_detection on public.chat_history;

-- Ahora sí podemos eliminar la función
drop function if exists public.trigger_critical_detection();

create or replace function public.trigger_critical_detection()
returns trigger
language plpgsql
security definer
as $$
declare
    v_detection jsonb;
    v_contact_user_id uuid;
    v_state_id bigint;
begin
    -- Solo procesar mensajes entrantes (incoming)
    if NEW.message_type != 'incoming' then
        return NEW;
    end if;
    
    -- Obtener user_id del contacto
    select user_id into v_contact_user_id
    from public.contacts
    where id = NEW.contact_id;
    
    if v_contact_user_id is null then
        return NEW;
    end if;
    
    -- Verificar si la conversación ya está pausada
    if exists (
        select 1 from public.conversation_states
        where contact_id = NEW.contact_id
          and is_paused = true
    ) then
        -- Si ya está pausada, no procesar
        return NEW;
    end if;
    
    -- Detectar intenciones críticas
    v_detection := public.detect_critical_intent(
        NEW.content,
        v_contact_user_id,
        NEW.contact_id
    );
    
    -- Si se detectó algo crítico
    if (v_detection->>'is_critical')::boolean then
        -- Registrar la detección
        insert into public.critical_detections (
            contact_id,
            user_id,
            message_id,
            detection_type,
            detected_content,
            confidence_score,
            metadata
        )
        values (
            NEW.contact_id,
            v_contact_user_id,
            NEW.id,
            v_detection->>'detection_type',
            v_detection->>'detected_content',
            (v_detection->>'confidence')::numeric,
            jsonb_build_object(
                'trigger_message_id', NEW.id,
                'trigger_message_content', NEW.content
            )
        );
        
        -- Pausar la conversación automáticamente
        v_state_id := public.pause_conversation(
            NEW.contact_id,
            v_contact_user_id,
            v_detection->>'detection_type',
            jsonb_build_object(
                'auto_paused', true,
                'detection_id', currval('public.critical_detections_id_seq'::regclass)
            )
        );
        
        -- Nota: La notificación se enviará desde la Edge Function o n8n
        -- para evitar bloqueos en el trigger
    end if;
    
    return NEW;
end;
$$;

-- Crear el trigger (ya fue eliminado arriba, solo lo recreamos)
create trigger trg_chat_history_critical_detection
    after insert on public.chat_history
    for each row
    execute function public.trigger_critical_detection();

-- Comentarios
comment on table public.conversation_states is 'Gestiona el estado de pausa/reanudación de conversaciones';
comment on table public.critical_detections is 'Registra todas las detecciones críticas de intenciones';
comment on table public.critical_keywords is 'Palabras clave personalizadas por usuario para detección crítica';
comment on function public.detect_critical_intent is 'Detecta intenciones críticas en el contenido de un mensaje';
comment on function public.pause_conversation is 'Pausa una conversación y registra el motivo';
comment on function public.resume_conversation is 'Reanuda una conversación pausada';

