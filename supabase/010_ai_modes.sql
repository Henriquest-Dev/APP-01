-- =====================================================================
-- Callout — AI analysis modes (summary / technical). Safe to re-run.
-- Run after 009_ai.sql.
-- =====================================================================

alter table public.ai_cache add column if not exists mode text not null default 'summary';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ai_cache_mode_known') then
    alter table public.ai_cache add constraint ai_cache_mode_known check (mode in ('summary', 'technical'));
  end if;
end;
$$;

-- One cached analysis per coin + language + mode.
alter table public.ai_cache drop constraint if exists ai_cache_pkey;
alter table public.ai_cache add primary key (coin_id, lang, mode);
