-- =====================================================================
-- Callout — price precision + history of every coin people trade.
--  1. CoinGecko rounds prices unless asked for full precision (XRP 1.3 vs
--     1.3032), which would distort entry prices: ask for full precision.
--     Also stores the 24h change, so lists need no extra CoinGecko calls.
--  2. Every coin that gets a call enters the catalog (history), even if it
--     never trended, so no coin is ever lost.
-- Run after 014_coin_prices.sql. Safe to re-run.
-- =====================================================================

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
  where e.key ~ '^[a-z0-9-]{1,100}$'
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
      url := 'https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_24hr_change=true&precision=full&ids=' || ids,
      headers := '{"accept": "application/json", "user-agent": "Callout/1.0"}'::jsonb,
      timeout_milliseconds := 20000));
  end if;
end;
$$;

revoke all on function public.refresh_coin_prices() from public, anon, authenticated;

-- Coins that were only ever called (never trended) have "never" as last trending date.
create or replace function public.catalog_from_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coin_id ~ '^[a-z0-9-]{1,100}$' then
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
where c.coin_id ~ '^[a-z0-9-]{1,100}$'
order by c.coin_id, c.created_at desc
on conflict (id) do nothing;
