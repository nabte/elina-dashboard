-- ============================================
-- Agregar control de IA para grupos
-- ============================================
-- Este campo permite controlar si la IA debe responder a mensajes de grupos
-- Similar al sistema de "ignorar" para contactos, pero específico para grupos

-- Agregar campo ai_enabled a whatsapp_groups
alter table public.whatsapp_groups
add column if not exists ai_enabled boolean default true not null;

-- Comentario para documentar el campo
comment on column public.whatsapp_groups.ai_enabled is 
'Controla si la IA debe responder a mensajes de este grupo. true = IA responde, false = IA no responde (similar a label "ignorar" en contactos)';

-- Crear índice para búsquedas rápidas
create index if not exists whatsapp_groups_ai_enabled_idx 
on public.whatsapp_groups (user_id, ai_enabled) 
where ai_enabled = false;

-- Actualizar grupos existentes para que tengan IA habilitada por defecto
-- (ya está configurado con default true, pero por si acaso)
update public.whatsapp_groups
set ai_enabled = true
where ai_enabled is null;

