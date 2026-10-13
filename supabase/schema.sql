-- =====================================================================
-- Callout — database schema (Supabase / PostgreSQL)
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: it drops and recreates functions, views and jobs.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------
-- Profiles: one row per account, created automatically on sign-up.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(username) between 1 and 40),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select using (true);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'caller'), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Prices: latest USD price per ticker symbol, refreshed by the server
-- every 2 minutes from a free public exchange API (no key, no cost).
-- ---------------------------------------------------------------------
create table if not exists public.prices (
  symbol text primary key,
  price numeric not null check (price > 0),
  updated_at timestamptz not null default now()
);

alter table public.prices enable row level security;

drop policy if exists "Prices are public" on public.prices;
create policy "Prices are public" on public.prices for select using (true);

-- ---------------------------------------------------------------------
-- Calls: a user's prediction. Immutable for users once created; only the
-- server resolves them (hit / miss).
-- ---------------------------------------------------------------------
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  coin_id text not null check (char_length(coin_id) between 1 and 100),
  symbol text not null check (char_length(symbol) between 1 and 20),
  name text not null check (char_length(name) between 1 and 100),
  image text,
  direction text not null check (direction in ('up', 'down')),
  entry_price numeric not null check (entry_price > 0),
  target_price numeric check (target_price > 0),
  timeframe text not null check (timeframe in ('24h', '7d', '30d')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'hit', 'miss', 'void')),
  exit_price numeric,
  resolved_at timestamptz
);

create index if not exists calls_user_idx on public.calls (user_id, created_at desc);
create index if not exists calls_open_idx on public.calls (expires_at) where status = 'open';
create index if not exists calls_coin_open_idx on public.calls (coin_id) where status = 'open';

alter table public.calls enable row level security;

drop policy if exists "Calls are public" on public.calls;
create policy "Calls are public" on public.calls for select using (true);

drop policy if exists "Users create their own calls" on public.calls;
create policy "Users create their own calls" on public.calls
  for insert to authenticated with check (auth.uid() = user_id);

-- No update/delete policies: users cannot edit or remove a call after making it.

grant select on public.profiles, public.prices, public.calls to anon, authenticated;
grant update (username) on public.profiles to authenticated;
grant insert (coin_id, symbol, name, image, direction, entry_price, target_price, timeframe) on public.calls to authenticated;

-- Server-side rules applied to every new call, whatever the app sends.
create or replace function public.prepare_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  server_price numeric;
  recent int;
begin
  new.user_id := auth.uid();
  new.symbol := upper(trim(new.symbol));
  new.created_at := now();
  new.status := 'open';
  new.exit_price := null;
  new.resolved_at := null;
  new.expires_at := now() + case new.timeframe
    when '24h' then interval '24 hours'
    when '7d' then interval '7 days'
    else interval '30 days'
  end;

  -- Use the server's own fresh price as the entry when we have one.
  select price into server_price
  from public.prices
  where symbol = new.symbol and updated_at > now() - interval '15 minutes';
  if server_price is not null then
    if abs(new.entry_price - server_price) / server_price > 0.10 then
      raise exception 'entry price is too far from the market price';
    end if;
    new.entry_price := server_price;
  end if;

  if new.target_price is not null then
    if new.direction = 'up' and new.target_price <= new.entry_price then
      raise exception 'target must be above the entry price for an up call';
    end if;
    if new.direction = 'down' and new.target_price >= new.entry_price then
      raise exception 'target must be below the entry price for a down call';
    end if;
  end if;

  -- Anti-spam: at most 30 calls per user per 24h and one open call per coin.
  select count(*) into recent
  from public.calls
  where user_id = new.user_id and created_at > now() - interval '24 hours';
  if recent >= 30 then
    raise exception 'daily call limit reached';
  end if;
  if exists (
    select 1 from public.calls
    where user_id = new.user_id and coin_id = new.coin_id and status = 'open'
  ) then
    raise exception 'you already have an open call on this coin';
  end if;

  return new;
end;
$$;

drop trigger if exists calls_prepare on public.calls;
create trigger calls_prepare
  before insert on public.calls
  for each row execute function public.prepare_call();

-- ---------------------------------------------------------------------
-- Read models used by the app.
-- ---------------------------------------------------------------------
create or replace view public.coin_consensus
with (security_invoker = on) as
select
  coin_id,
  count(*) filter (where direction = 'up')::int as up_votes,
  count(*) filter (where direction = 'down')::int as down_votes,
  count(*)::int as total
from public.calls
where status = 'open'
group by coin_id;

create or replace view public.leaderboard
with (security_invoker = on) as
select
  p.id as user_id,
  p.username,
  count(*)::int as resolved,
  count(*) filter (where c.status = 'hit')::int as hits,
  round(100.0 * count(*) filter (where c.status = 'hit') / count(*))::int as accuracy
from public.calls c
join public.profiles p on p.id = c.user_id
where c.status in ('hit', 'miss')
  and c.resolved_at > now() - interval '30 days'
group by p.id, p.username;

grant select on public.coin_consensus, public.leaderboard to anon, authenticated;

-- ---------------------------------------------------------------------
-- Price refresh + call resolution (runs on the server every 2 minutes).
-- pg_net requests are asynchronous: each run first reads the answer to the
-- previous request, then fires the next one.
-- ---------------------------------------------------------------------
create table if not exists public.price_requests (
  id bigint primary key,
  created_at timestamptz not null default now(),
  processed boolean not null default false
);

alter table public.price_requests enable row level security;
-- (no policies: only the server touches this table)

create or replace function public.resolve_calls()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  changed int := 0;
  n int;
begin
  -- Targets reached before the deadline count as hits right away.
  update public.calls c
  set status = 'hit', exit_price = p.price, resolved_at = now()
  from public.prices p
  where c.status = 'open'
    and p.symbol = c.symbol
    and p.updated_at > now() - interval '15 minutes'
    and c.target_price is not null
    and ((c.direction = 'up' and p.price >= c.target_price)
      or (c.direction = 'down' and p.price <= c.target_price));
  get diagnostics n = row_count;
  changed := changed + n;

  -- At the deadline: with a target → it was not reached (miss);
  -- without a target → judged by the direction of the move.
  update public.calls c
  set status = case
        when c.target_price is not null then 'miss'
        when c.direction = 'up' and p.price > c.entry_price then 'hit'
        when c.direction = 'down' and p.price < c.entry_price then 'hit'
        else 'miss'
      end,
      exit_price = p.price,
      resolved_at = now()
  from public.prices p
  where c.status = 'open'
    and c.expires_at <= now()
    and p.symbol = c.symbol
    and p.updated_at > now() - interval '15 minutes';
  get diagnostics n = row_count;
  changed := changed + n;

  -- Coins we can't price at all for 2 days after the deadline are voided.
  update public.calls
  set status = 'void', resolved_at = now()
  where status = 'open' and expires_at < now() - interval '2 days';
  get diagnostics n = row_count;
  changed := changed + n;

  return changed;
end;
$$;

create or replace function public.ingest_prices(payload jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  -- MEXC format: [{"symbol":"BTCUSDT","price":"83000.1"}, ...]
  insert into public.prices (symbol, price, updated_at)
  select distinct on (sym) sym, px, now()
  from (
    select
      left(e ->> 'symbol', length(e ->> 'symbol') - 4) as sym,
      (e ->> 'price')::numeric as px
    from jsonb_array_elements(payload) e
    where e ->> 'symbol' like '%USDT'
      and (e ->> 'price') ~ '^[0-9]+(\.[0-9]+)?$'
  ) t
  where px > 0 and sym <> ''
  on conflict (symbol) do update set price = excluded.price, updated_at = excluded.updated_at;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.refresh_prices()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  req record;
  body jsonb;
begin
  -- 1. Read answers to earlier requests.
  for req in
    select r.id, resp.status_code, resp.content
    from public.price_requests r
    join net._http_response resp on resp.id = r.id
    where not r.processed
    order by r.id
  loop
    if req.status_code = 200 then
      begin
        body := req.content::jsonb;
        if jsonb_typeof(body) = 'array' then
          perform public.ingest_prices(body);
        end if;
      exception when others then
        raise warning 'callout: could not parse price payload (%)', sqlerrm;
      end;
    end if;
    update public.price_requests set processed = true where id = req.id;
  end loop;

  delete from public.price_requests where created_at < now() - interval '1 day';

  -- 2. Settle calls with the fresh prices.
  perform public.resolve_calls();

  -- 3. Ask for the next batch (free, no API key).
  insert into public.price_requests (id)
  values (net.http_get(url := 'https://api.mexc.com/api/v3/ticker/price', timeout_milliseconds := 20000));
end;
$$;

revoke all on function public.refresh_prices() from public, anon, authenticated;
revoke all on function public.resolve_calls() from public, anon, authenticated;
revoke all on function public.ingest_prices(jsonb) from public, anon, authenticated;

-- Schedule (re-running this file replaces the job).
select cron.unschedule(jobid) from cron.job where jobname = 'callout-refresh-prices';
select cron.schedule('callout-refresh-prices', '*/2 * * * *', 'select public.refresh_prices()');

-- Kick off the first request right away.
select public.refresh_prices();

-- ---------------------------------------------------------------------
-- Realtime: the app listens to new/resolved calls for live consensus.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;
end;
$$;
