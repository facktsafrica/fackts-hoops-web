-- FACKTS Hoops Admin Rebuild - Phase 1 / M12
-- Adds optimistic-concurrency and status-change evidence to canonical games.

begin;

alter table public.games
  add column if not exists version integer not null default 1,
  add column if not exists status_note text,
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_changed_by uuid references public.admin_profiles(id) on delete set null;

create or replace function public.phase1_bump_game_version()
returns trigger
language plpgsql
as $$
begin
  new.version := coalesce(old.version, 1) + 1;
  return new;
end;
$$;

drop trigger if exists phase1_games_bump_version on public.games;
create trigger phase1_games_bump_version
before update on public.games
for each row execute function public.phase1_bump_game_version();

create index if not exists games_status_event_date_phase1_idx
  on public.games(status, event_id, game_date desc);

comment on column public.games.version is
  'Optimistic-concurrency token used by Phase 1 operational game and statistics writes.';
comment on column public.games.status_note is
  'Required operational explanation for postponement, cancellation or reopening.';

commit;
