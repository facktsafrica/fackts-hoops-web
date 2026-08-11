-- FACKTS Hoops Admin Rebuild - Phase 1 / M14
-- Extends the one canonical stats table with submission evidence.

begin;

alter table public.player_game_stats
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists verification_note text,
  add column if not exists last_period text;

create index if not exists player_game_stats_game_workflow_idx
  on public.player_game_stats(game_id, entry_status, verification_status, team_side);

comment on column public.player_game_stats.period_values is
  'Per-period values for the shared statistics engine. Top-level columns remain canonical game totals.';
comment on column public.player_game_stats.autosave_version is
  'Optimistic-concurrency token. Clients must reload after a version conflict.';

commit;
