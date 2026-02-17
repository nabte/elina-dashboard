-- Sales prompts for conversational context
create table if not exists public.sales_prompts (
    id bigint generated always as identity primary key,
    user_id uuid references auth.users not null,
    title text not null,
    prompt jsonb not null,
    is_active boolean default true,
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null
);

create index if not exists sales_prompts_user_idx on public.sales_prompts (user_id, is_active);

create or replace trigger trg_sales_prompts_updated_at
    before update on public.sales_prompts
    for each row
    execute function public.set_updated_at();

create or replace view public.sales_prompts_active as
select distinct on (user_id)
    id,
    user_id,
    title,
    prompt,
    created_at,
    updated_at
from public.sales_prompts
where is_active is true
order by user_id, updated_at desc;


-- Google OAuth storage for calendar scheduling
create table if not exists public.google_credentials (
    user_id uuid primary key references auth.users,
    refresh_token text not null,
    access_token text,
    expires_at timestamptz,
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null
);

create or replace trigger trg_google_credentials_updated_at
    before update on public.google_credentials
    for each row
    execute function public.set_updated_at();


create table if not exists public.meetings (
    id bigint generated always as identity primary key,
    user_id uuid references auth.users not null,
    contact_id bigint references public.contacts(id),
    external_id text not null, -- Google Calendar event id
    html_link text,
    summary text,
    start_time timestamptz not null,
    end_time timestamptz not null,
    status text default 'confirmed',
    metadata jsonb,
    created_at timestamptz default timezone('utc', now()) not null
);

create index if not exists meetings_user_idx on public.meetings (user_id, contact_id);


-- Escalation alerts configuration and logging
create table if not exists public.escalation_settings (
    user_id uuid primary key references auth.users,
    notify_phone text,
    notify_email text,
    alert_labels text[] default '{}',
    created_at timestamptz default timezone('utc', now()) not null,
    updated_at timestamptz default timezone('utc', now()) not null
);

create or replace trigger trg_escalation_settings_updated_at
    before update on public.escalation_settings
    for each row
    execute function public.set_updated_at();

create table if not exists public.escalation_events (
    id bigint generated always as identity primary key,
    user_id uuid references auth.users not null,
    contact_id bigint references public.contacts(id),
    escalation_type text not null,
    payload jsonb,
    delivered boolean default false,
    delivered_at timestamptz,
    created_at timestamptz default timezone('utc', now()) not null
);

create index if not exists escalation_events_user_idx on public.escalation_events (user_id, escalation_type, delivered);
