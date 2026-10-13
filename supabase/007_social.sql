-- =====================================================================
-- Callout — social layer: unique @handles, bio, followers, public profile
-- cards (for search + badges) and group banners. Safe to re-run.
-- Run after the other SQL files.
-- =====================================================================

-- Needs 006_subscriptions.sql first (it creates public.is_pro).
do $$
begin
  if to_regprocedure('public.is_pro(uuid)') is null then
    raise exception 'Run 006_subscriptions.sql first, then run this file again.';
  end if;
end;
$$;

-- ---- Handles + bio --------------------------------------------------
alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists bio text;

-- Builds a clean handle from a name; the id suffix keeps it unique.
create or replace function public.make_handle(name text, uid uuid)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(lower(coalesce(name, '')), '[^a-z0-9_]', '', 'g')) >= 3
      then left(regexp_replace(lower(name), '[^a-z0-9_]', '', 'g'), 13)
    else 'caller'
  end || '_' || substr(md5(uid::text), 1, 6);
$$;

update public.profiles set handle = public.make_handle(username, id) where handle is null;

alter table public.profiles alter column handle set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_handle_format') then
    alter table public.profiles add constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,20}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_bio_len') then
    alter table public.profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 160);
  end if;
end;
$$;

create unique index if not exists profiles_handle_key on public.profiles (handle);
create index if not exists profiles_username_idx on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'caller'), 40);
begin
  insert into public.profiles (id, username, handle)
  values (new.id, nm, public.make_handle(nm, new.id))
  on conflict (id) do nothing;
  return new;
end;
$$;

grant update (username, handle, bio) on public.profiles to authenticated;

-- ---- Follows --------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

drop policy if exists "Follows are public" on public.follows;
create policy "Follows are public" on public.follows for select using (true);
drop policy if exists "Follow as myself" on public.follows;
create policy "Follow as myself" on public.follows for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists "Unfollow" on public.follows;
create policy "Unfollow" on public.follows for delete to authenticated using (follower_id = auth.uid());

grant select on public.follows to anon, authenticated;
grant insert (followee_id) on public.follows to authenticated;
grant delete on public.follows to authenticated;

-- ---- Public profile card: what search and the profile screen read ----
create or replace view public.profile_cards
with (security_invoker = on) as
select
  p.id, p.username, p.handle, p.bio, p.created_at,
  (select count(*)::int from public.follows f where f.followee_id = p.id) as follower_count,
  (select count(*)::int from public.follows f where f.follower_id = p.id) as following_count,
  (select count(*)::int from public.calls c where c.user_id = p.id) as calls_total,
  (select count(*)::int from public.calls c where c.user_id = p.id and c.status in ('hit', 'miss')) as calls_resolved,
  (select count(*)::int from public.calls c where c.user_id = p.id and c.status = 'hit') as calls_hits,
  public.is_pro(p.id) as pro
from public.profiles p;

grant select on public.profile_cards to anon, authenticated;

-- ---- Group banners (a colour theme picked at creation) --------------
alter table public.groups add column if not exists banner text not null default 'violet';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'groups_banner_known') then
    alter table public.groups add constraint groups_banner_known
      check (banner in ('violet', 'ocean', 'mint', 'sunset', 'rose', 'slate'));
  end if;
end;
$$;

grant insert (banner) on public.groups to authenticated;
grant update (banner) on public.groups to authenticated;

drop view if exists public.group_list cascade;
create view public.group_list
with (security_invoker = on) as
select
  g.id, g.name, g.description, g.is_public, g.invite_code, g.owner_id, g.created_at, g.last_message_at, g.banner,
  (select count(*)::int from public.group_members m where m.group_id = g.id) as member_count
from public.groups g;

grant select on public.group_list to anon, authenticated;
