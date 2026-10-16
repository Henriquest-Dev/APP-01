-- =====================================================================
-- Callout — prices for ANY coin (not only the ones listed on MEXC).
-- Calls on coins that just started trending need a server-side price to be
-- fixed at entry and settled later. The server now asks CoinGecko (free, no
-- key) by coin id for every coin with an open call and every trending coin,
-- and falls back to MEXC by symbol. Run after 013_profile.sql. Safe to re-run.
-- =====================================================================

create table if not exists public.coin_prices (
  coin_id text primary key check (coin_id ~ '^[a-z0-9-]{1,100}$'),
  price numeric not null check (price > 0),
  updated_at timestamptz not null default now()
);

alter table public.coin_prices enable row level security;
drop policy if exists "Coin prices are public" on public.coin_prices;
create policy "Coin prices are public" on public.coin_prices for select using (true);
grant select on public.coin_prices to anon, authenticated;

-- Best fresh price we have: by coin id (CoinGecko), else by symbol (MEXC).
create or replace function public.price_for(coin text, sym text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select price from public.coin_prices where coin_id = coin and updated_at > now() - interval '15 minutes'),
    (select price from public.prices where symbol = upper(sym) and updated_at > now() - interval '15 minutes')
  );
$$;

revoke all on function public.price_for(text, text) from public, anon, authenticated;

-- Reads CoinGecko's /simple/price answer: {"bitcoin": {"usd": 83000}, ...}
create or replace function public.ingest_coin_prices(payload jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if jsonb_typeof(payload) <> 'object' then return 0; end if;
  insert into public.coin_prices (coin_id, price, updated_at)
  select e.key, (e.value ->> 'usd')::numeric, now()
  from jsonb_each(payload) e
  where e.key ~ '^[a-z0-9-]{1,100}$'
    and jsonb_typeof(e.value) = 'object'
    and (e.value ->> 'usd') ~ '^[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$'
    and (e.value ->> 'usd')::numeric > 0
  on conflict (coin_id) do update set price = excluded.price, updated_at = excluded.updated_at;
  get diagnostics n = row_count;
  return n;
end;
$$;

create table if not exists public.coin_price_requests (
  id bigint primary key,
  created_at timestamptz not null default now(),
  processed boolean not null default false
);
alter table public.coin_price_requests enable row level security;   -- server only

create or replace function public.refresh_coin_prices()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  req record;
  body jsonb;
  ids text;
begin
  for req in
    select r.id, resp.status_code, resp.content
    from public.coin_price_requests r
    join net._http_response resp on resp.id = r.id
    where not r.processed
    order by r.id
  loop
    if req.status_code = 200 then
      begin
        body := req.content::jsonb;
        perform public.ingest_coin_prices(body);
      exception when others then
        raise warning 'callout: could not parse coin prices (%)', sqlerrm;
      end;
    end if;
    update public.coin_price_requests set processed = true where id = req.id;
  end loop;

  delete from public.coin_price_requests where created_at < now() - interval '1 day';

  -- Settle with whatever is freshest now (also covers coins with MEXC prices).
  perform public.resolve_calls();

  -- Coins with an open call, plus the ones trending right now (so a new
  -- trending coin already has a price when someone wants to call it).
  select string_agg(coin_id, ',') into ids
  from (
    select coin_id from public.calls where status = 'open'
    union
    select id from public.coin_catalog where last_trending_at > now() - interval '3 hours'
    limit 250
  ) t;

  if ids is not null then
    insert into public.coin_price_requests (id)
    values (net.http_get(
      url := 'https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=' || ids,
      headers := '{"accept": "application/json", "user-agent": "Callout/1.0"}'::jsonb,
      timeout_milliseconds := 20000));
  end if;
end;
$$;

revoke all on function public.ingest_coin_prices(jsonb) from public, anon, authenticated;
revoke all on function public.refresh_coin_prices() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'callout-refresh-coin-prices';
select cron.schedule('callout-refresh-coin-prices', '*/2 * * * *', 'select public.refresh_coin_prices()');

-- ---- Entry price: by coin id first, then by symbol ----------------------
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
  server_price := public.price_for(new.coin_id, new.symbol);
  if server_price is not null then
    -- Coins that just started trending can move fast between refreshes: 20 % margin.
    if abs(new.entry_price - server_price) / server_price > 0.20 then
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

-- ---- Settling: same price source ---------------------------------------
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
  set status = 'hit', exit_price = public.price_for(c.coin_id, c.symbol), resolved_at = now()
  where c.status = 'open'
    and c.target_price is not null
    and public.price_for(c.coin_id, c.symbol) is not null
    and ((c.direction = 'up' and public.price_for(c.coin_id, c.symbol) >= c.target_price)
      or (c.direction = 'down' and public.price_for(c.coin_id, c.symbol) <= c.target_price));
  get diagnostics n = row_count;
  changed := changed + n;

  -- At the deadline: with a target → it was not reached (miss);
  -- without a target → judged by the direction of the move.
  update public.calls c
  set status = case
        when c.target_price is not null then 'miss'
        when c.direction = 'up' and public.price_for(c.coin_id, c.symbol) > c.entry_price then 'hit'
        when c.direction = 'down' and public.price_for(c.coin_id, c.symbol) < c.entry_price then 'hit'
        else 'miss'
      end,
      exit_price = public.price_for(c.coin_id, c.symbol),
      resolved_at = now()
  where c.status = 'open'
    and c.expires_at <= now()
    and public.price_for(c.coin_id, c.symbol) is not null;
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

revoke all on function public.resolve_calls() from public, anon, authenticated;

-- First run right away; its answer is read (and calls settled) on the next one.
select public.refresh_coin_prices();
select pg_sleep(6);
select public.refresh_coin_prices();
