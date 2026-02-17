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
