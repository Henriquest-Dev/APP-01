-- =====================================================================
-- Callout — price precision + history of every coin people trade.
--  1. CoinGecko rounds prices unless asked for full precision (XRP 1.3 vs
--     1.3032), which would distort entry prices: ask for full precision.
--     Also stores the 24h change, so lists need no extra CoinGecko calls.
--  3. Coin ids may contain "_" (16 real coins do) and are validated before they
--     are put in a request URL, so no one can corrupt the price refresh.
--  2. Every coin that gets a call enters the catalog (history), even if it
--     never trended, so no coin is ever lost.
-- Run after 014_coin_prices.sql. Safe to re-run.
-- =====================================================================

-- ---- Coin ids: letters, digits, "-" and "_" (all 22,314 CoinGecko ids fit) ----
alter table public.coin_catalog drop constraint if exists coin_catalog_id_check;
alter table public.coin_catalog add constraint coin_catalog_id_check check (id ~ '^[a-z0-9_-]{1,100}$');
alter table public.coin_prices drop constraint if exists coin_prices_coin_id_check;
alter table public.coin_prices add constraint coin_prices_coin_id_check check (coin_id ~ '^[a-z0-9_-]{1,100}$');

create or replace function public.ingest_trending(payload jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  item jsonb;
  cid text;
  img text;
begin
  for item in select e -> 'item' from jsonb_array_elements(coalesce(payload -> 'coins', '[]'::jsonb)) e loop
    cid := item ->> 'id';
    continue when cid is null or cid !~ '^[a-z0-9_-]{1,100}$'
      or coalesce(item ->> 'name', '') = '';

    img := coalesce(item ->> 'large', item ->> 'small', item ->> 'thumb');
    if img is null or img !~ '^https://(coin-images|assets)\.coingecko\.com/' then img := null; end if;

    insert into public.coin_catalog (id, symbol, name, image, market_cap_rank)
    values (
      cid,
      coalesce(nullif(upper(left(item ->> 'symbol', 20)), ''), upper(left(cid, 12))),
      left(item ->> 'name', 100),
      img,
      nullif(item ->> 'market_cap_rank', '')::int
    )
    on conflict (id) do update set
      symbol = excluded.symbol,
      name = excluded.name,
      image = coalesce(excluded.image, public.coin_catalog.image),
      market_cap_rank = excluded.market_cap_rank,
      trending_count = public.coin_catalog.trending_count
        + case when public.coin_catalog.last_trending_at < now() - interval '40 minutes' then 1 else 0 end,
      trending_since = case when public.coin_catalog.last_trending_at < now() - interval '40 minutes'
        then now() else public.coin_catalog.trending_since end,
      last_trending_at = now();
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.ingest_trending(jsonb) from public, anon, authenticated;

-- 24h change next to the price, so the app can list many coins without calling CoinGecko itself.
alter table public.coin_prices add column if not exists change_24h numeric;

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
  insert into public.coin_prices (coin_id, price, change_24h, updated_at)
  select
    e.key,
    (e.value ->> 'usd')::numeric,
    case when (e.value ->> 'usd_24h_change') ~ '^-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$'
         then (e.value ->> 'usd_24h_change')::numeric end,
    now()
  from jsonb_each(payload) e
  where e.key ~ '^[a-z0-9_-]{1,100}$'
    and jsonb_typeof(e.value) = 'object'
    and (e.value ->> 'usd') ~ '^[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$'
    and (e.value ->> 'usd')::numeric > 0
  on conflict (coin_id) do update
    set price = excluded.price,
        change_24h = coalesce(excluded.change_24h, public.coin_prices.change_24h),
        updated_at = excluded.updated_at;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.ingest_coin_prices(jsonb) from public, anon, authenticated;

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

  perform public.resolve_calls();

  -- Trending coins first, then the coins with the most open calls. Only well-formed
  -- ids go into the URL (a call's coin_id is typed by the user's phone).
  select string_agg(coin_id, ',' order by prio, n desc) into ids
  from (
    select * from (
      select id as coin_id, 0 as prio, 0 as n
      from public.coin_catalog
      where last_trending_at > now() - interval '3 hours' and id ~ '^[a-z0-9_-]{1,100}$'
      union all
      select coin_id, 1, count(*)::int
      from public.calls
      where status = 'open' and coin_id ~ '^[a-z0-9_-]{1,100}$'
      group by coin_id
    ) u
    order by prio, n desc
    limit 250
  ) t;

  if ids is not null then
    insert into public.coin_price_requests (id)
    values (net.http_get(
      url := 'https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_24hr_change=true&precision=full&ids=' || ids,
      headers := '{"accept": "application/json", "user-agent": "Callout/1.0"}'::jsonb,
      timeout_milliseconds := 20000));
  end if;
end;
$$;

revoke all on function public.refresh_coin_prices() from public, anon, authenticated;


-- ---- Which price source belongs to which call -----------------------------------
-- A ticker is not an identity: a small coin can share its symbol with a different
-- coin listed on MEXC. Each call remembers how its price was matched:
--   coin   = by CoinGecko id (always correct)
--   symbol = by MEXC ticker, only when that price agreed with the coin's (within 20%)
--   client = no server price yet; the phone's price is used until the id price arrives
alter table public.calls add column if not exists price_source text not null default 'symbol';
alter table public.calls alter column price_source set default 'client';
alter table public.calls drop constraint if exists calls_price_source_known;
alter table public.calls add constraint calls_price_source_known check (price_source in ('coin', 'symbol', 'client'));

create or replace function public.call_price(c public.calls)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select price from public.coin_prices where coin_id = c.coin_id and updated_at > now() - interval '15 minutes'),
    case when c.price_source = 'symbol' then
      (select price from public.prices where symbol = upper(c.symbol) and updated_at > now() - interval '15 minutes')
    end
  );
$$;

revoke all on function public.call_price(public.calls) from public, anon, authenticated;

create or replace function public.prepare_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  coin_price numeric;
  mexc_price numeric;
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

  select price into coin_price from public.coin_prices
  where coin_id = new.coin_id and updated_at > now() - interval '15 minutes';
  select price into mexc_price from public.prices
  where symbol = new.symbol and updated_at > now() - interval '15 minutes';

  if coin_price is not null then
    -- Coins that just started trending can move fast between refreshes: 20 % margin.
    if abs(new.entry_price - coin_price) / coin_price > 0.20 then
      raise exception 'entry price is too far from the market price';
    end if;
    new.entry_price := coin_price;
    new.price_source := 'coin';
  elsif mexc_price is not null and abs(new.entry_price - mexc_price) / mexc_price <= 0.20 then
    new.entry_price := mexc_price;
    new.price_source := 'symbol';
  else
    -- No trustworthy server price yet (or the ticker belongs to another coin):
    -- the id-based price arrives within minutes and then fixes the entry.
    new.price_source := 'client';
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
  -- Calls opened before a server price existed get settled by the id price once it
  -- arrives. Within 30 minutes the entry is fixed to that first server price (the
  -- phone's price could have been wrong); older ones keep their entry unless it was
  -- far off, in which case they are voided instead of being settled unfairly.
  update public.calls c
  set status = 'void', resolved_at = now()
  from public.coin_prices cp
  where c.status = 'open' and c.price_source = 'client'
    and cp.coin_id = c.coin_id and cp.updated_at > now() - interval '15 minutes'
    and (
      (c.created_at < now() - interval '30 minutes' and abs(c.entry_price - cp.price) / cp.price > 0.20)
      or (c.target_price is not null
          and ((c.direction = 'up' and c.target_price <= cp.price) or (c.direction = 'down' and c.target_price >= cp.price))
          and c.created_at >= now() - interval '30 minutes')
    );
  get diagnostics n = row_count;
  changed := changed + n;

  update public.calls c
  set entry_price = case when c.created_at >= now() - interval '30 minutes' then cp.price else c.entry_price end,
      price_source = 'coin'
  from public.coin_prices cp
  where c.status = 'open' and c.price_source = 'client'
    and cp.coin_id = c.coin_id and cp.updated_at > now() - interval '15 minutes';

  -- Targets reached before the deadline count as hits right away.
  update public.calls c
  set status = 'hit', exit_price = public.call_price(c), resolved_at = now()
  where c.status = 'open'
    and c.price_source <> 'client'
    and c.target_price is not null
    and public.call_price(c) is not null
    and ((c.direction = 'up' and public.call_price(c) >= c.target_price)
      or (c.direction = 'down' and public.call_price(c) <= c.target_price));
  get diagnostics n = row_count;
  changed := changed + n;

  -- At the deadline: with a target → it was not reached (miss);
  -- without a target → judged by the direction of the move.
  update public.calls c
  set status = case
        when c.target_price is not null then 'miss'
        when c.direction = 'up' and public.call_price(c) > c.entry_price then 'hit'
        when c.direction = 'down' and public.call_price(c) < c.entry_price then 'hit'
        else 'miss'
      end,
      exit_price = public.call_price(c),
      resolved_at = now()
  where c.status = 'open'
    and c.price_source <> 'client'
    and c.expires_at <= now()
    and public.call_price(c) is not null;
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

-- Coins that were only ever called (never trended) have "never" as last trending date.
create or replace function public.catalog_from_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coin_id ~ '^[a-z0-9_-]{1,100}$' then
    insert into public.coin_catalog (id, symbol, name, image, last_trending_at, trending_since, trending_count)
    values (
      new.coin_id,
      upper(left(new.symbol, 20)),
      left(new.name, 100),
      case when new.image ~ '^https://(coin-images|assets)\.coingecko\.com/' then new.image end,
      'epoch', 'epoch', 0
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists calls_to_catalog on public.calls;
create trigger calls_to_catalog after insert on public.calls
  for each row execute function public.catalog_from_call();

-- Coins from calls made before this existed.
insert into public.coin_catalog (id, symbol, name, image, last_trending_at, trending_since, trending_count)
select distinct on (c.coin_id)
  c.coin_id, upper(left(c.symbol, 20)), left(c.name, 100),
  case when c.image ~ '^https://(coin-images|assets)\.coingecko\.com/' then c.image end,
  'epoch'::timestamptz, 'epoch'::timestamptz, 0
from public.calls c
where c.coin_id ~ '^[a-z0-9_-]{1,100}$'
order by c.coin_id, c.created_at desc
on conflict (id) do nothing;
