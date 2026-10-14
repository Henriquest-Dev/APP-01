-- =====================================================================
-- Callout — coin catalog. Every coin that ever shows up in CoinGecko's
-- "trending" list is remembered here, so coins that leave the list are not
-- lost: the app keeps them in a catalog and flags them when they come back.
-- The server checks trending every 15 minutes (free public API, no key).
-- Run after 010_ai_modes.sql. Safe to re-run.
-- =====================================================================

create table if not exists public.coin_catalog (
  id text primary key check (id ~ '^[a-z0-9-]{1,100}$'),
  symbol text not null check (char_length(symbol) between 1 and 20),
  name text not null check (char_length(name) between 1 and 100),
  image text,
  market_cap_rank int,
  first_seen_at timestamptz not null default now(),
  last_trending_at timestamptz not null default now(),
  -- When the current stretch in the trending list began.
  trending_since timestamptz not null default now(),
  -- How many separate times it has entered the list (1 = first time).
  trending_count int not null default 1
);

create index if not exists coin_catalog_last_idx on public.coin_catalog (last_trending_at desc);

alter table public.coin_catalog enable row level security;
drop policy if exists "Catalog is public" on public.coin_catalog;
create policy "Catalog is public" on public.coin_catalog for select using (true);
grant select on public.coin_catalog to anon, authenticated;

-- What the app reads: is it trending right now, and did it just come back?
create or replace view public.catalog
with (security_invoker = on) as
select
  c.id, c.symbol, c.name, c.image, c.market_cap_rank, c.first_seen_at, c.last_trending_at,
  c.trending_since, c.trending_count,
  c.last_trending_at > now() - interval '40 minutes' as trending_now,
  (c.trending_count > 1
    and c.last_trending_at > now() - interval '40 minutes'
    and c.trending_since > now() - interval '24 hours') as returned
from public.coin_catalog c;

grant select on public.catalog to anon, authenticated;

-- Reads CoinGecko's /search/trending payload into the catalog.
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
    continue when cid is null or cid !~ '^[a-z0-9-]{1,100}$'
      or coalesce(item ->> 'symbol', '') = '' or coalesce(item ->> 'name', '') = '';

    img := coalesce(item ->> 'large', item ->> 'small', item ->> 'thumb');
    if img is null or img !~ '^https://(coin-images|assets)\.coingecko\.com/' then img := null; end if;

    insert into public.coin_catalog (id, symbol, name, image, market_cap_rank)
    values (
      cid,
      upper(left(item ->> 'symbol', 20)),
      left(item ->> 'name', 100),
      img,
      nullif(item ->> 'market_cap_rank', '')::int
    )
    on conflict (id) do update set
      symbol = excluded.symbol,
      name = excluded.name,
      image = coalesce(excluded.image, public.coin_catalog.image),
      market_cap_rank = excluded.market_cap_rank,
      -- Coming back after being out of the list for 40+ minutes starts a new stretch.
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

-- Same request/answer pattern as the price refresh (pg_net is asynchronous).
create table if not exists public.trending_requests (
  id bigint primary key,
  created_at timestamptz not null default now(),
  processed boolean not null default false
);
alter table public.trending_requests enable row level security;   -- server only

create or replace function public.refresh_trending()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  req record;
  body jsonb;
begin
  for req in
    select r.id, resp.status_code, resp.content
    from public.trending_requests r
    join net._http_response resp on resp.id = r.id
    where not r.processed
    order by r.id
  loop
    if req.status_code = 200 then
      begin
        body := req.content::jsonb;
        perform public.ingest_trending(body);
      exception when others then
        raise warning 'callout: could not parse trending payload (%)', sqlerrm;
      end;
    end if;
    update public.trending_requests set processed = true where id = req.id;
  end loop;

  delete from public.trending_requests where created_at < now() - interval '1 day';

  insert into public.trending_requests (id)
  values (net.http_get(
    url := 'https://api.coingecko.com/api/v3/search/trending',
    headers := '{"accept": "application/json", "user-agent": "Callout/1.0"}'::jsonb,
    timeout_milliseconds := 20000));
end;
$$;

revoke all on function public.ingest_trending(jsonb) from public, anon, authenticated;
revoke all on function public.refresh_trending() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'callout-refresh-trending';
select cron.schedule('callout-refresh-trending', '*/15 * * * *', 'select public.refresh_trending()');

-- First request right away, then read its answer a few seconds later so the
-- catalog is not empty for the first 15 minutes.
select public.refresh_trending();
select pg_sleep(6);
select public.refresh_trending();
