-- =====================================================================
-- Callout — Lives. People stream on YouTube / Twitch / Kick / etc. and
-- register the link here; Callout shows it, and anyone (even guests) can
-- watch and share it. No video passes through our servers (free).
-- Run after 007_social.sql. Safe to re-run.
-- =====================================================================

create table if not exists public.lives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('youtube', 'twitch', 'kick', 'other')),
  ref text not null default '',
  url text not null check (char_length(url) <= 300),
  title text not null check (char_length(trim(title)) between 3 and 80),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Only links from known live platforms (blocks arbitrary / phishing links).
  constraint lives_url_allowed check (url ~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtu\.be|twitch\.tv|kick\.com|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|x\.com|twitter\.com|rumble\.com|trovo\.live)/'),
  constraint lives_ref_format check (
    (provider = 'youtube' and ref ~ '^[A-Za-z0-9_-]{11}$')
    or (provider in ('twitch', 'kick') and ref ~ '^[A-Za-z0-9_]{3,25}$')
    or provider = 'other')
);

-- One running live per person.
create unique index if not exists lives_one_open_idx on public.lives (user_id) where ended_at is null;
create index if not exists lives_started_idx on public.lives (started_at desc);

alter table public.lives enable row level security;

drop policy if exists "Lives are public" on public.lives;
create policy "Lives are public" on public.lives for select using (true);
drop policy if exists "Start my live" on public.lives;
create policy "Start my live" on public.lives for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "End my live" on public.lives;
create policy "End my live" on public.lives for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Delete my live" on public.lives;
create policy "Delete my live" on public.lives for delete to authenticated using (user_id = auth.uid());

grant select on public.lives to anon, authenticated;
grant insert (provider, ref, url, title) on public.lives to authenticated;
grant update (ended_at) on public.lives to authenticated;
grant delete on public.lives to authenticated;

-- A forgotten live (older than 12 hours) is closed automatically when its
-- owner starts a new one.
create or replace function public.close_stale_lives()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lives set ended_at = now()
  where user_id = new.user_id and ended_at is null and started_at < now() - interval '12 hours';
  return new;
end;
$$;

drop trigger if exists lives_close_stale on public.lives;
create trigger lives_close_stale before insert on public.lives
  for each row execute function public.close_stale_lives();

-- What the app lists: running lives (max 12 h old), with the host's name.
create or replace view public.live_feed
with (security_invoker = on) as
select l.id, l.user_id, p.username, p.handle, l.provider, l.ref, l.url, l.title, l.started_at, l.ended_at
from public.lives l
join public.profiles p on p.id = l.user_id
where l.ended_at is null and l.started_at > now() - interval '12 hours';

grant select on public.live_feed to anon, authenticated;

-- Lives can be reported like posts and calls.
do $$
begin
  alter table public.reports drop constraint if exists reports_target_type_check;
  alter table public.reports add constraint reports_target_type_check
    check (target_type in ('post', 'comment', 'message', 'user', 'call', 'live'));
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lives'
  ) then
    alter publication supabase_realtime add table public.lives;
  end if;
end;
$$;
