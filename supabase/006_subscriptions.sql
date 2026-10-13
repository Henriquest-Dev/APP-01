-- =====================================================================
-- Callout Pro — subscriptions (the free replacement for RevenueCat).
-- The app buys through Google Play; the "billing" Edge Function confirms the
-- purchase with Google and writes here. Users can only READ their own row.
-- Run after the other SQL files. Safe to re-run.
-- =====================================================================

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  product_id text not null,
  purchase_token text not null unique,
  -- Mirrors Google's subscription states
  state text not null check (state in ('active', 'grace', 'canceled', 'on_hold', 'paused', 'pending', 'expired', 'revoked')),
  auto_renewing boolean not null default false,
  started_at timestamptz,
  expires_at timestamptz,
  test_purchase boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "See my subscription" on public.subscriptions;
create policy "See my subscription" on public.subscriptions for select to authenticated using (user_id = auth.uid());
-- (no insert/update/delete policies or grants: only the server, with the service key, writes)

grant select on public.subscriptions to authenticated;

-- Audit trail for support ("why am I not Pro?"); readable only from the dashboard.
create table if not exists public.billing_events (
  id bigint generated always as identity primary key,
  user_id uuid,
  kind text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;

-- Pro = paid period still running. "canceled" in Google's vocabulary means the
-- user turned off renewal but already paid until expires_at, so access stays.
create or replace function public.is_pro(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select s.state in ('active', 'grace', 'canceled') and s.expires_at > now()
     from public.subscriptions s where s.user_id = uid),
    false);
$$;

revoke all on function public.is_pro(uuid) from public;
grant execute on function public.is_pro(uuid) to anon, authenticated;

-- Realtime so the app flips to Pro the moment the server confirms the purchase.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'subscriptions'
  ) then
    alter publication supabase_realtime add table public.subscriptions;
  end if;
end;
$$;
