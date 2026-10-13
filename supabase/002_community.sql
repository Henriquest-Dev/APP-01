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
  select exists (select 1 from public.groups where id = g and (is_public or owner_id = auth.uid()))
         or public.is_group_member(g);
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
create policy "Visible groups" on public.groups for select
  using (is_public or owner_id = auth.uid() or public.is_group_member(id));
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
