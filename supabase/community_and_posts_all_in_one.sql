-- =====================================================================
-- Callout — communities, groups, chat and live call feed
-- Run AFTER schema.sql: Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Calls get an optional thesis ("why I think so"), shown in the feed.
-- ---------------------------------------------------------------------
alter table public.calls add column if not exists note text;
alter table public.calls drop constraint if exists calls_note_length;
alter table public.calls add constraint calls_note_length check (note is null or char_length(note) <= 280);
grant insert (note) on public.calls to authenticated;

-- Live feed of everyone's calls with the caller's name.
create or replace view public.call_feed
with (security_invoker = on) as
select
  c.id, c.user_id, p.username, c.coin_id, c.symbol, c.name, c.image, c.direction,
  c.entry_price, c.target_price, c.timeframe, c.note, c.status, c.exit_price,
  c.created_at, c.expires_at
from public.calls c
join public.profiles p on p.id = c.user_id;

grant select on public.call_feed to anon, authenticated;

-- ---------------------------------------------------------------------
-- Groups ("panelinhas"): public (anyone can join) or private (invite code).
-- ---------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 40),
  description text check (description is null or char_length(description) <= 200),
  is_public boolean not null default true,
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  owner_id uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  call_id uuid references public.calls (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint messages_not_empty check (char_length(trim(body)) > 0 or call_id is not null)
);

create index if not exists messages_group_idx on public.messages (group_id, id desc);

-- Membership checks used by the policies (security definer avoids policy recursion).
create or replace function public.is_group_member(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.group_members where group_id = g and user_id = auth.uid());
$$;

create or replace function public.can_view_group(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.groups where id = g and is_public) or public.is_group_member(g);
$$;

create or replace function public.is_group_owner(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.groups where id = g and owner_id = auth.uid());
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Visible groups" on public.groups;
create policy "Visible groups" on public.groups for select using (is_public or public.is_group_member(id));
drop policy if exists "Create groups" on public.groups;
create policy "Create groups" on public.groups for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "Owners edit groups" on public.groups;
create policy "Owners edit groups" on public.groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Owners delete groups" on public.groups;
create policy "Owners delete groups" on public.groups for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "Visible members" on public.group_members;
create policy "Visible members" on public.group_members for select using (public.can_view_group(group_id));
drop policy if exists "Join public groups" on public.group_members;
create policy "Join public groups" on public.group_members for insert to authenticated
  with check (
    user_id = auth.uid() and role = 'member'
    and exists (select 1 from public.groups g where g.id = group_id and g.is_public)
  );
drop policy if exists "Leave or remove" on public.group_members;
create policy "Leave or remove" on public.group_members for delete to authenticated
  using ((user_id = auth.uid() and role <> 'owner') or (public.is_group_owner(group_id) and user_id <> auth.uid()));

drop policy if exists "Read messages" on public.messages;
create policy "Read messages" on public.messages for select using (public.can_view_group(group_id));
drop policy if exists "Members post" on public.messages;
create policy "Members post" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));
drop policy if exists "Delete own messages" on public.messages;
create policy "Delete own messages" on public.messages for delete to authenticated using (user_id = auth.uid());

grant select on public.groups, public.group_members, public.messages to anon, authenticated;
grant insert (name, description, is_public) on public.groups to authenticated;
grant update (name, description, is_public) on public.groups to authenticated;
grant delete on public.groups to authenticated;
grant insert (group_id, user_id) on public.group_members to authenticated;
grant delete on public.group_members to authenticated;
grant insert (group_id, body, call_id) on public.messages to authenticated;
grant delete on public.messages to authenticated;

-- The creator becomes the owner member.
create or replace function public.add_group_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.group_members (group_id, user_id, role)
    values (new.id, new.owner_id, 'owner')
    on conflict (group_id, user_id) do update set role = 'owner';
  end if;
  return new;
end;
$$;

drop trigger if exists groups_add_owner on public.groups;
create trigger groups_add_owner after insert on public.groups
  for each row execute function public.add_group_owner();

-- Anti-spam + integrity for messages.
create or replace function public.prepare_message()
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
  select count(*) into recent from public.messages
  where user_id = new.user_id and created_at > now() - interval '1 minute';
  if recent >= 20 then
    raise exception 'slow down: too many messages';
  end if;
  if new.call_id is not null and not exists (
    select 1 from public.calls where id = new.call_id and user_id = new.user_id
  ) then
    raise exception 'you can only share your own calls';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_prepare on public.messages;
create trigger messages_prepare before insert on public.messages
  for each row execute function public.prepare_message();

create or replace function public.touch_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.groups set last_message_at = new.created_at where id = new.group_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_group on public.messages;
create trigger messages_touch_group after insert on public.messages
  for each row execute function public.touch_group();

-- Join a private (or public) group with its invite code.
create or replace function public.join_group_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select id into gid from public.groups where invite_code = upper(trim(code));
  if gid is null then
    raise exception 'invalid invite code';
  end if;
  insert into public.group_members (group_id, user_id) values (gid, auth.uid())
  on conflict (group_id, user_id) do nothing;
  return gid;
end;
$$;

revoke all on function public.join_group_by_code(text) from public, anon;
grant execute on function public.join_group_by_code(text) to authenticated;

-- Groups with member counts, for lists.
create or replace view public.group_list
with (security_invoker = on) as
select
  g.id, g.name, g.description, g.is_public, g.invite_code, g.owner_id, g.created_at, g.last_message_at,
  (select count(*)::int from public.group_members m where m.group_id = g.id) as member_count
from public.groups g;

grant select on public.group_list to anon, authenticated;

-- An open community room everyone can find.
insert into public.groups (id, name, description, is_public, owner_id)
values ('00000000-0000-0000-0000-00000000c0de', 'Callout Geral', 'Sala aberta da comunidade Callout', true, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Realtime for chat and membership.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['messages', 'group_members', 'groups'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
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
-- =====================================================================
-- Callout — X-style post actions: reposts, bookmarks and view counts.
-- Run AFTER 003. Safe to re-run.
-- =====================================================================

alter table public.posts add column if not exists view_count int not null default 0;

create table if not exists public.post_reposts (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_reposts_created_idx on public.post_reposts (created_at desc);

create table if not exists public.post_bookmarks (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Who viewed what stays private; only the counter on the post is public.
create table if not exists public.post_views (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_reposts enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.post_views enable row level security;

drop policy if exists "Reposts are public" on public.post_reposts;
create policy "Reposts are public" on public.post_reposts for select using (true);
drop policy if exists "Repost as myself" on public.post_reposts;
create policy "Repost as myself" on public.post_reposts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Undo my repost" on public.post_reposts;
create policy "Undo my repost" on public.post_reposts for delete to authenticated using (user_id = auth.uid());

drop policy if exists "See my bookmarks" on public.post_bookmarks;
create policy "See my bookmarks" on public.post_bookmarks for select to authenticated using (user_id = auth.uid());
drop policy if exists "Bookmark as myself" on public.post_bookmarks;
create policy "Bookmark as myself" on public.post_bookmarks for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Remove my bookmark" on public.post_bookmarks;
create policy "Remove my bookmark" on public.post_bookmarks for delete to authenticated using (user_id = auth.uid());

-- (post_views has no policies: only record_post_view() touches it)

grant select on public.post_reposts to anon, authenticated;
grant insert (post_id) on public.post_reposts to authenticated;
grant delete on public.post_reposts to authenticated;
grant select, delete on public.post_bookmarks to authenticated;
grant insert (post_id) on public.post_bookmarks to authenticated;

create or replace function public.prepare_repost()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists reposts_prepare on public.post_reposts;
create trigger reposts_prepare before insert on public.post_reposts
  for each row execute function public.prepare_repost();

create or replace function public.prepare_bookmark()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists bookmarks_prepare on public.post_bookmarks;
create trigger bookmarks_prepare before insert on public.post_bookmarks
  for each row execute function public.prepare_bookmark();

-- Counts one view per person per post (the author's own views don't count).
create or replace function public.record_post_view(p uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
begin
  if auth.uid() is null then
    return;
  end if;
  if exists (select 1 from public.posts where id = p and user_id = auth.uid()) then
    return;
  end if;
  insert into public.post_views (post_id, user_id) values (p, auth.uid())
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    update public.posts set view_count = view_count + 1 where id = p;
  end if;
end;
$$;

revoke all on function public.record_post_view(uuid) from public, anon;
grant execute on function public.record_post_view(uuid) to authenticated;

-- Feed views: new columns are appended so existing columns keep their order.
-- Dropped first so this file can be re-run after the others (dependent views are recreated below).
drop view if exists public.post_feed cascade;
create view public.post_feed
with (security_invoker = on) as
select
  p.id, p.user_id, pr.username, p.body, p.media_type, p.media_path, p.media_width, p.media_height,
  p.coin_id, p.created_at,
  (select count(*)::int from public.post_likes l where l.post_id = p.id) as like_count,
  (select count(*)::int from public.post_comments c where c.post_id = p.id) as comment_count,
  (select count(*)::int from public.post_reposts r where r.post_id = p.id) as repost_count,
  p.view_count
from public.posts p
join public.profiles pr on pr.id = p.user_id;

-- A repost shows up in the feed as "<name> reposted" above the original.
create or replace view public.repost_feed
with (security_invoker = on) as
select
  r.created_at as reposted_at, r.user_id as reposter_id, rp.username as reposter_name,
  f.id, f.user_id, f.username, f.body, f.media_type, f.media_path, f.media_width, f.media_height,
  f.coin_id, f.created_at, f.like_count, f.comment_count, f.repost_count, f.view_count
from public.post_reposts r
join public.profiles rp on rp.id = r.user_id
join public.post_feed f on f.id = r.post_id;

-- My saved posts (visible only to me through the bookmark policy).
create or replace view public.bookmark_feed
with (security_invoker = on) as
select
  b.user_id as saver_id, b.created_at as saved_at,
  f.id, f.user_id, f.username, f.body, f.media_type, f.media_path, f.media_width, f.media_height,
  f.coin_id, f.created_at, f.like_count, f.comment_count, f.repost_count, f.view_count
from public.post_bookmarks b
join public.post_feed f on f.id = b.post_id;

grant select on public.post_feed, public.repost_feed, public.bookmark_feed to anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['post_reposts'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
