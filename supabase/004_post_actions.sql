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
create or replace view public.post_feed
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
