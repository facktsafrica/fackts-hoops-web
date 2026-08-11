-- FACKTS Hoops Admin Rebuild - Phase 1 / M10
-- Ensures every new canonical player/person receives a stable compatibility alias.
-- Existing player and guest records are preserved without name-based merging.

begin;

create or replace function public.phase1_ensure_canonical_player_alias()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.legacy_identity_aliases (
    legacy_source,
    legacy_id,
    legacy_route_id,
    canonical_player_id,
    alias_type,
    is_active,
    metadata
  ) values (
    'players',
    new.id::text,
    new.id::text,
    new.id,
    'canonical_player',
    true,
    jsonb_build_object(
      'phase', 'Phase 1',
      'created_with_canonical_workflow', true
    )
  )
  on conflict (legacy_source, legacy_id) do update
  set canonical_player_id = excluded.canonical_player_id,
      legacy_route_id = excluded.legacy_route_id,
      is_active = true,
      metadata = public.legacy_identity_aliases.metadata || excluded.metadata,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists phase1_canonical_player_alias_trigger on public.players;
create trigger phase1_canonical_player_alias_trigger
after insert on public.players
for each row execute function public.phase1_ensure_canonical_player_alias();

-- Backfill is repeat-safe and covers any rows created after M02 but before M10.
insert into public.legacy_identity_aliases (
  legacy_source,
  legacy_id,
  legacy_route_id,
  canonical_player_id,
  alias_type,
  is_active,
  metadata
)
select
  'players',
  player.id::text,
  player.id::text,
  player.id,
  'canonical_player',
  true,
  jsonb_build_object('phase', 'Phase 1', 'backfilled', true)
from public.players player
on conflict (legacy_source, legacy_id) do update
set canonical_player_id = excluded.canonical_player_id,
    is_active = true,
    metadata = public.legacy_identity_aliases.metadata || excluded.metadata,
    updated_at = now();

comment on function public.phase1_ensure_canonical_player_alias() is
  'Creates compatibility evidence for new canonical people without matching or merging anyone by name.';

commit;
