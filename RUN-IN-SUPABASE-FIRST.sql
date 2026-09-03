-- FACKTS Hoops: reversible game archiving support
-- Run this in Supabase SQL Editor BEFORE deploying the matching app files.

begin;

alter table public.games
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text,
  add column if not exists archive_reason text,
  add column if not exists archived_previous_is_public boolean;

create index if not exists games_archived_at_idx
  on public.games (archived_at);

comment on column public.games.archived_at is
  'When set, the game is archived and removed from the active Games Hub.';

comment on column public.games.archived_by is
  'Admin profile identifier that archived the game.';

comment on column public.games.archive_reason is
  'Administrative reason supplied when the game was archived.';

comment on column public.games.archived_previous_is_public is
  'Stores the previous public visibility so Restore can safely reinstate it.';

commit;
