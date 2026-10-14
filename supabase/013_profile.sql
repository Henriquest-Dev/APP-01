-- =====================================================================
-- Callout — rich profiles: photo, banner, location, link, custom labels
-- and user-made stickers (usable in group chat). Safe to re-run.
-- Run after 012_notifications.sql.
-- =====================================================================

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists banner_path text;
alter table public.profiles add column if not exists banner_color text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists website text;

do $$
begin
  -- Images must live in the person's own storage folder (media/<user id>/...).
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_own_folder') then
    alter table public.profiles add constraint profiles_avatar_own_folder
      check (avatar_path is null or avatar_path like id::text || '/%');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_banner_own_folder') then
    alter table public.profiles add constraint profiles_banner_own_folder
      check (banner_path is null or banner_path like id::text || '/%');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_banner_color_known') then
    alter table public.profiles add constraint profiles_banner_color_known
      check (banner_color is null or banner_color in ('violet', 'ocean', 'mint', 'sunset', 'rose', 'slate'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_location_len') then
    alter table public.profiles add constraint profiles_location_len
      check (location is null or char_length(location) <= 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_website_format') then
    alter table public.profiles add constraint profiles_website_format
      check (website is null or (char_length(website) <= 120 and website ~* '^https?://[^\s]+$'));
  end if;
end;
$$;

grant update (avatar_path, banner_path, banner_color, location, website) on public.profiles to authenticated;

-- ---- Labels: short coloured tags shown under the bio ------------------
create table if not exists public.profile_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label text not null check (char_length(trim(label)) between 2 and 20),
  color text not null default 'violet' check (color in ('violet', 'ocean', 'mint', 'sunset', 'rose', 'slate')),
  created_at timestamptz not null default now()
);

create unique index if not exists profile_labels_unique on public.profile_labels (user_id, lower(label));
create index if not exists profile_labels_user_idx on public.profile_labels (user_id, created_at);

alter table public.profile_labels enable row level security;
drop policy if exists "Labels are public" on public.profile_labels;
create policy "Labels are public" on public.profile_labels for select using (true);
drop policy if exists "Add my labels" on public.profile_labels;
create policy "Add my labels" on public.profile_labels for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Remove my labels" on public.profile_labels;
create policy "Remove my labels" on public.profile_labels for delete to authenticated using (user_id = auth.uid());

grant select on public.profile_labels to anon, authenticated;
grant insert (label, color) on public.profile_labels to authenticated;
grant delete on public.profile_labels to authenticated;

create or replace function public.limit_labels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.profile_labels where user_id = new.user_id) >= 6 then
    raise exception 'label limit reached';
  end if;
  new.label := trim(new.label);
  return new;
end;
$$;

drop trigger if exists profile_labels_limit on public.profile_labels;
create trigger profile_labels_limit before insert on public.profile_labels
  for each row execute function public.limit_labels();

-- ---- Stickers: images people make and use in group chat --------------
create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  path text not null check (char_length(path) <= 200),
  created_at timestamptz not null default now(),
  constraint stickers_own_folder check (path like user_id::text || '/stickers/%')
);

create index if not exists stickers_user_idx on public.stickers (user_id, created_at desc);

alter table public.stickers enable row level security;
drop policy if exists "Stickers are public" on public.stickers;
create policy "Stickers are public" on public.stickers for select using (true);
drop policy if exists "Make my stickers" on public.stickers;
create policy "Make my stickers" on public.stickers for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Delete my stickers" on public.stickers;
create policy "Delete my stickers" on public.stickers for delete to authenticated using (user_id = auth.uid());

grant select on public.stickers to anon, authenticated;
grant insert (id, path) on public.stickers to authenticated;
grant delete on public.stickers to authenticated;

create or replace function public.limit_stickers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.stickers where user_id = new.user_id) >= 30 then
    raise exception 'sticker limit reached';
  end if;
  return new;
end;
$$;

drop trigger if exists stickers_limit on public.stickers;
create trigger stickers_limit before insert on public.stickers
  for each row execute function public.limit_stickers();

-- A chat message can now be a sticker (deleting the sticker removes those messages).
alter table public.messages add column if not exists sticker_id uuid references public.stickers (id) on delete cascade;

alter table public.messages drop constraint if exists messages_not_empty;
alter table public.messages add constraint messages_not_empty
  check (char_length(trim(body)) > 0 or call_id is not null or sticker_id is not null);

grant insert (sticker_id) on public.messages to authenticated;

-- ---- Profile card now carries the new fields --------------------------
drop view if exists public.profile_cards cascade;
create view public.profile_cards
with (security_invoker = on) as
select
  p.id, p.username, p.handle, p.bio, p.created_at,
  p.avatar_path, p.banner_path, p.banner_color, p.location, p.website,
  (select count(*)::int from public.follows f where f.followee_id = p.id) as follower_count,
  (select count(*)::int from public.follows f where f.follower_id = p.id) as following_count,
  (select count(*)::int from public.calls c where c.user_id = p.id) as calls_total,
  (select count(*)::int from public.calls c where c.user_id = p.id and c.status in ('hit', 'miss')) as calls_resolved,
  (select count(*)::int from public.calls c where c.user_id = p.id and c.status = 'hit') as calls_hits,
  public.is_pro(p.id) as pro
from public.profiles p;

grant select on public.profile_cards to anon, authenticated;
