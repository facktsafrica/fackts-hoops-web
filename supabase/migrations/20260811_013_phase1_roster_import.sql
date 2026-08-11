-- FACKTS Hoops Admin Rebuild - Phase 1 / M13
-- Completes the staged roster-import contract and provides one atomic commit.

begin;

alter table public.roster_import_batches
  add column if not exists file_type text,
  add column if not exists default_team_side text not null default 'home',
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_note text;

alter table public.roster_import_rows
  add column if not exists team_side text not null default 'home',
  add column if not exists participation_role text not null default 'player';

alter table public.roster_import_batches
  drop constraint if exists roster_import_batches_default_team_side_check;
alter table public.roster_import_batches
  add constraint roster_import_batches_default_team_side_check
  check (default_team_side in ('home','away','neutral'));

alter table public.roster_import_rows
  drop constraint if exists roster_import_rows_team_side_check,
  drop constraint if exists roster_import_rows_participation_role_check;
alter table public.roster_import_rows
  add constraint roster_import_rows_team_side_check
    check (team_side in ('home','away','neutral')),
  add constraint roster_import_rows_participation_role_check
    check (participation_role in ('player','guest','external','coach','staff'));

create unique index if not exists roster_import_batches_game_file_hash_unique
  on public.roster_import_batches(game_id, file_hash)
  where file_hash is not null;

create or replace function public.phase1_commit_roster_import(
  p_batch_id uuid,
  p_committed_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  batch_record public.roster_import_batches%rowtype;
  inserted_count integer := 0;
begin
  select * into batch_record
  from public.roster_import_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'ROSTER_IMPORT_BATCH_NOT_FOUND';
  end if;

  if batch_record.status = 'committed' then
    return jsonb_build_object(
      'batch_id', batch_record.id,
      'game_id', batch_record.game_id,
      'committed', true,
      'idempotent', true,
      'inserted_count', batch_record.valid_rows
    );
  end if;

  if batch_record.status <> 'validated'
     or batch_record.total_rows = 0
     or batch_record.error_rows <> 0
     or batch_record.valid_rows <> batch_record.total_rows then
    raise exception 'ROSTER_IMPORT_NOT_FULLY_VALIDATED';
  end if;

  if exists (
    select 1 from public.roster_import_rows row
    where row.batch_id = p_batch_id
      and (
        row.candidate_player_id is null
        or row.match_status <> 'exact'
        or jsonb_array_length(row.validation_errors) > 0
      )
  ) then
    raise exception 'ROSTER_IMPORT_CONTAINS_INVALID_ROWS';
  end if;

  if exists (
    select candidate_player_id
    from public.roster_import_rows
    where batch_id = p_batch_id
    group by candidate_player_id
    having count(*) > 1
  ) then
    raise exception 'ROSTER_IMPORT_CONTAINS_DUPLICATE_PEOPLE';
  end if;

  if exists (
    select 1
    from public.roster_import_rows staged
    join public.game_rosters roster
      on roster.game_id::text = batch_record.game_id::text
     and roster.player_id = staged.candidate_player_id
    where staged.batch_id = p_batch_id
  ) then
    raise exception 'ROSTER_IMPORT_PERSON_ALREADY_ROSTERED';
  end if;

  insert into public.game_rosters (
    game_id,
    player_id,
    roster_role,
    roster_status,
    participation_role,
    team_side,
    jersey_snapshot,
    notes,
    canonicalized_at,
    created_at,
    updated_at
  )
  select
    batch_record.game_id,
    row.candidate_player_id,
    coalesce(nullif(row.roster_role, ''), 'bench'),
    coalesce(nullif(row.roster_status, ''), 'confirmed'),
    coalesce(nullif(row.participation_role, ''), 'player'),
    coalesce(nullif(row.team_side, ''), batch_record.default_team_side),
    row.jersey_number,
    'Roster import batch ' || batch_record.id::text,
    now(),
    now(),
    now()
  from public.roster_import_rows row
  where row.batch_id = p_batch_id
  order by row.row_number;

  get diagnostics inserted_count = row_count;

  update public.roster_import_rows staged
  set committed_roster_id = roster.id::text,
      updated_at = now()
  from public.game_rosters roster
  where staged.batch_id = p_batch_id
    and roster.game_id::text = batch_record.game_id::text
    and roster.player_id = staged.candidate_player_id;

  update public.roster_import_batches
  set status = 'committed',
      committed_by = p_committed_by,
      committed_at = now(),
      updated_at = now()
  where id = p_batch_id;

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'game_id', batch_record.game_id,
    'committed', true,
    'idempotent', false,
    'inserted_count', inserted_count
  );
end;
$$;

revoke all on function public.phase1_commit_roster_import(uuid, uuid) from public, anon, authenticated;
grant execute on function public.phase1_commit_roster_import(uuid, uuid) to service_role;

comment on function public.phase1_commit_roster_import(uuid, uuid) is
  'All-or-nothing canonical roster commit for a fully validated Phase 1 import batch.';

commit;
