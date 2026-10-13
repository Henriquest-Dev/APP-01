-- =====================================================================
-- Callout — posts (image / short video), likes, comments, reports,
-- blocking and account deletion.
-- Run AFTER schema.sql and 002_community.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Media storage: public bucket, 20 MB max, images and short videos only.
-- Each user uploads only inside their own folder: media/<user id>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Media: upload to own folder" on storage.objects;
create policy "Media: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Media: delete own files" on storage.objects;
create policy "Media: delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Media: list own files" on storage.objects;
create policy "Media: list own files" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 500),
  media_type text check (media_type in ('image', 'video')),
  media_path text check (media_path is null or char_length(media_path) <= 300),
  media_width int,
  media_height int,
  coin_id text check (coin_id is null or char_length(coin_id) <= 100),
  created_at timestamptz not null default now(),
  constraint posts_not_empty check (char_length(trim(body)) > 0 or media_path is not null),
  constraint posts_media_pair check ((media_type is null) = (media_path is null))
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_user_idx on public.posts (user_id, created_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, id);

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "Posts are public" on public.posts;
create policy "Posts are public" on public.posts for select using (true);
drop policy if exists "Create own posts" on public.posts;
create policy "Create own posts" on public.posts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Delete own posts" on public.posts;
create policy "Delete own posts" on public.posts for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Likes are public" on public.post_likes;
create policy "Likes are public" on public.post_likes for select using (true);
drop policy if exists "Like as myself" on public.post_likes;
create policy "Like as myself" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Unlike my likes" on public.post_likes;
create policy "Unlike my likes" on public.post_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Comments are public" on public.post_comments;
create policy "Comments are public" on public.post_comments for select using (true);
drop policy if exists "Comment as myself" on public.post_comments;
create policy "Comment as myself" on public.post_comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Delete own comments" on public.post_comments;
create policy "Delete own comments" on public.post_comments for delete to authenticated using (user_id = auth.uid());

grant select on public.posts, public.post_likes, public.post_comments to anon, authenticated;
grant insert (body, media_type, media_path, media_width, media_height, coin_id) on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant insert (post_id) on public.post_likes to authenticated;
grant delete on public.post_likes to authenticated;
grant insert (post_id, body) on public.post_comments to authenticated;
grant delete on public.post_comments to authenticated;

-- Server rules for posts: owner, own media folder, 10 posts per hour.
create or replace function public.prepare_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  new.user_id := auth.uid();
  new.created_at := now();
  new.body := trim(new.body);
  if new.media_path is not null and split_part(new.media_path, '/', 1) <> auth.uid()::text then
    raise exception 'media must be in your own folder';
  end if;
  select count(*) into recent from public.posts
  where user_id = new.user_id and created_at > now() - interval '1 hour';
  if recent >= 10 then
    raise exception 'slow down: too many posts';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_prepare on public.posts;
create trigger posts_prepare before insert on public.posts
  for each row execute function public.prepare_post();

create or replace function public.prepare_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  new.user_id := auth.uid();
  new.created_at := now();
  new.body := trim(new.body);
  select count(*) into recent from public.post_comments
  where user_id = new.user_id and created_at > now() - interval '10 minutes';
  if recent >= 30 then
    raise exception 'slow down: too many comments';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_prepare on public.post_comments;
create trigger comments_prepare before insert on public.post_comments
  for each row execute function public.prepare_comment();

create or replace function public.prepare_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists likes_prepare on public.post_likes;
create trigger likes_prepare before insert on public.post_likes
  for each row execute function public.prepare_like();

-- Dropped first so this file can be re-run after the others (dependent views are recreated below).
drop view if exists public.post_feed cascade;
create view public.post_feed
with (security_invoker = on) as
select
  p.id, p.user_id, pr.username, p.body, p.media_type, p.media_path, p.media_width, p.media_height,
  p.coin_id, p.created_at,
  (select count(*)::int from public.post_likes l where l.post_id = p.id) as like_count,
  (select count(*)::int from public.post_comments c where c.post_id = p.id) as comment_count
from public.posts p
join public.profiles pr on pr.id = p.user_id;

create or replace view public.comment_feed
with (security_invoker = on) as
select c.id, c.post_id, c.user_id, pr.username, c.body, c.created_at
from public.post_comments c
join public.profiles pr on pr.id = c.user_id;

grant select on public.post_feed, public.comment_feed to anon, authenticated;

-- ---------------------------------------------------------------------
-- Safety: reports and blocking (required for user-generated content).
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'message', 'user', 'call')),
  target_id text not null check (char_length(target_id) <= 100),
  reason text check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
drop policy if exists "File reports" on public.reports;
create policy "File reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
-- (no select policy: reports are reviewed in the Supabase dashboard)
grant insert (target_type, target_id, reason) on public.reports to authenticated;

create table if not exists public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;
drop policy if exists "See my blocks" on public.blocks;
create policy "See my blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists "Block as myself" on public.blocks;
create policy "Block as myself" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists "Unblock" on public.blocks;
create policy "Unblock" on public.blocks for delete to authenticated using (blocker_id = auth.uid());
grant select, delete on public.blocks to authenticated;
grant insert (blocked_id) on public.blocks to authenticated;

-- ---------------------------------------------------------------------
-- Account: users can delete their own account (and all their data).
-- The app removes the user's media files first, then calls this.
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------
-- Realtime for posts, likes and comments.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['posts', 'post_likes', 'post_comments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
