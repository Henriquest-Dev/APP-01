-- Fix: the creator of a private group could not read it back right after creating it.
-- Owners can now always see their own groups. Run once; safe to re-run.

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

drop policy if exists "Visible groups" on public.groups;
create policy "Visible groups" on public.groups for select
  using (is_public or owner_id = auth.uid() or public.is_group_member(id));
