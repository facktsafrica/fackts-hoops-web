-- FACKTS Hoops Admin Rebuild - Phase 1 / M11
-- Adds stable setup keys so repeated wizard saves update operational rows
-- instead of creating duplicate participants, fixtures or deliverables.

begin;

alter table public.event_entries
  add column if not exists setup_key text;

alter table public.event_deliverables
  add column if not exists setup_key text;

alter table public.games
  add column if not exists setup_key text;

create unique index if not exists event_entries_setup_key_unique
  on public.event_entries(event_id, setup_key);

create unique index if not exists event_deliverables_setup_key_unique
  on public.event_deliverables(event_id, setup_key);

create unique index if not exists games_event_setup_key_unique
  on public.games(event_id, setup_key);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'games_event_case_study_fk'
      and conrelid = 'public.games'::regclass
  ) then
    alter table public.games
      add constraint games_event_case_study_fk
      foreign key (event_id)
      references public.event_case_studies(event_id)
      on delete set null
      not valid;
  end if;
end
$$;

comment on column public.event_entries.setup_key is
  'Stable Phase 1 event-wizard identity. Null preserves legacy/imported entries.';
comment on column public.event_deliverables.setup_key is
  'Stable Phase 1 event-wizard identity. Null preserves legacy deliverables.';
comment on column public.games.setup_key is
  'Stable Phase 1 event-wizard fixture identity. Null preserves existing games.';

commit;
