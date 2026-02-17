create or replace function public.is_superadmin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists(
    select 1
    from public.profiles
    where id = user_id
      and coalesce(role, 'user') = 'superadmin'
  );
$$;

revoke all on function public.is_superadmin(uuid) from public;
grant execute on function public.is_superadmin(uuid) to anon, authenticated;
