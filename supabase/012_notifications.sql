-- =====================================================================
-- Callout — notifications (free: in-app inbox + push through Firebase
-- Cloud Messaging). Events create rows here; the "push" Edge Function sends
-- them to the phones. Run after 011_catalog.sql. Safe to re-run.
-- =====================================================================

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('call_hit', 'call_miss', 'follow')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  pushed_at timestamptz
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unpushed_idx on public.notifications (created_at) where pushed_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Read my notifications" on public.notifications;
create policy "Read my notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "Mark my notifications read" on public.notifications;
create policy "Mark my notifications read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Delete my notifications" on public.notifications;
create policy "Delete my notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- Phones that can receive push (FCM tokens). Written only through the functions below.
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default 'android',
  lang text not null default 'en',
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;   -- no policies: functions only

create or replace function public.register_push_token(t text, l text default 'en')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if t is null or char_length(t) < 20 or char_length(t) > 4096 then raise exception 'bad token'; end if;
  -- One phone token belongs to one account at a time (switching accounts moves it).
  insert into public.push_tokens (token, user_id, lang, updated_at)
  values (t, auth.uid(), left(coalesce(l, 'en'), 5), now())
  on conflict (token) do update set user_id = auth.uid(), lang = excluded.lang, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(t text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens where token = t and user_id = auth.uid();
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ---- Events -----------------------------------------------------------

create or replace function public.notify_call_resolved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'open' and new.status in ('hit', 'miss') then
    insert into public.notifications (user_id, kind, data)
    values (
      new.user_id,
      case when new.status = 'hit' then 'call_hit' else 'call_miss' end,
      jsonb_build_object(
        'call_id', new.id, 'coin_id', new.coin_id, 'symbol', new.symbol,
        'direction', new.direction, 'entry', new.entry_price, 'exit', new.exit_price)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists calls_notify_resolved on public.calls;
create trigger calls_notify_resolved after update of status on public.calls
  for each row execute function public.notify_call_resolved();

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who record;
begin
  -- Follow / unfollow / follow again should not spam the same person.
  if exists (
    select 1 from public.notifications
    where user_id = new.followee_id and kind = 'follow'
      and data ->> 'follower_id' = new.follower_id::text
      and created_at > now() - interval '1 day'
  ) then
    return new;
  end if;
  select username, handle into who from public.profiles where id = new.follower_id;
  insert into public.notifications (user_id, kind, data)
  values (new.followee_id, 'follow',
    jsonb_build_object('follower_id', new.follower_id, 'name', who.username, 'handle', who.handle));
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_follow();

-- Realtime so the bell badge updates instantly.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

-- ---- Push delivery ----------------------------------------------------
-- Every minute: if something is waiting and a phone can receive it, wake the
-- "push" Edge Function. Needs two private settings in public.app_secrets
-- (see supabase/PUSH_SETUP.md): functions_url and push_secret.

create or replace function public.push_pending()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fn_url text;
  secret text;
begin
  if not exists (
    select 1
    from public.notifications n
    join public.push_tokens t on t.user_id = n.user_id
    where n.pushed_at is null and n.created_at > now() - interval '1 day'
  ) then
    return;
  end if;

  select value into fn_url from public.app_secrets where name = 'functions_url';
  select value into secret from public.app_secrets where name = 'push_secret';
  if fn_url is null or secret is null then return; end if;

  perform net.http_post(
    url := fn_url || '/push',
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end;
$$;

revoke all on function public.push_pending() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'callout-push';
select cron.schedule('callout-push', '* * * * *', 'select public.push_pending()');
