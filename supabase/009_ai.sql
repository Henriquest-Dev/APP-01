-- =====================================================================
-- Callout — AI market analysis (OpenRouter, free model).
-- The "ai" Edge Function holds the API key and calls the model; these tables
-- only hold usage limits and a short-lived cache. Safe to re-run.
-- =====================================================================

create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  uses int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;   -- no policies: server only

-- Same coin + language within the cache window reuses one analysis (saves the free quota).
create table if not exists public.ai_cache (
  coin_id text not null,
  lang text not null,
  body text not null,
  created_at timestamptz not null default now(),
  primary key (coin_id, lang)
);
alter table public.ai_cache enable row level security;   -- no policies: server only

-- Private settings for server functions (API keys). RLS on and no policies:
-- the app can never read it, only the Edge Functions (service role) can.
create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Takes one use from today's per-person and global budget. Returns false when exhausted.
create or replace function public.ai_take_quota(uid uuid, per_user int, per_day int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  mine int;
  total int;
begin
  select coalesce(sum(uses), 0) into total from public.ai_usage where day = current_date;
  if total >= per_day then return false; end if;

  insert into public.ai_usage (user_id, day, uses) values (uid, current_date, 1)
  on conflict (user_id, day) do update set uses = public.ai_usage.uses + 1
  where public.ai_usage.uses < per_user
  returning uses into mine;

  return mine is not null;
end;
$$;

revoke all on function public.ai_take_quota(uuid, int, int) from public, anon, authenticated;
grant execute on function public.ai_take_quota(uuid, int, int) to service_role;
