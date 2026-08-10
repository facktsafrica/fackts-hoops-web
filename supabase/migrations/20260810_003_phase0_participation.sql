-- FACKTS Hoops Admin Rebuild - Phase 0 / M03
-- One canonical participation path through public.game_rosters.
-- public.game_guest_rosters remains readable and writable for rollback until
-- the Phase 1 roster module is approved and deployed.

begin;

alter table public.game_rosters
  add column if not exists participation_role text not null default 'player',
  add column if not exists team_side text not null default 'home',
  add column if not exists jersey_snapshot text,
  add column if not exists legacy_guest_roster_id text,
  add column if not exists canonicalized_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.game_rosters
  drop constraint if exists game_rosters_participation_role_check,
  drop constraint if exists game_rosters_team_side_check;

alter table public.game_rosters
  add constraint game_rosters_participation_role_check
    check (participation_role in ('player','guest','external','coach','staff')),
  add constraint game_rosters_team_side_check
    check (team_side in ('home','away','neutral'));

create unique index if not exists game_rosters_legacy_guest_id_unique
  on public.game_rosters(legacy_guest_roster_id)
  where legacy_guest_roster_id is not null;

-- Queue orphan guest roster rows instead of discarding or guessing them.
insert into public.migration_review_issues (
  issue_key, issue_type, source_table, source_id, target_table, severity, summary, details
)
select
  'M03:guest_roster_unmapped:' || roster.id::text,
  'unmapped_guest_participation',
  'game_guest_rosters',
  roster.id::text,
  'game_rosters',
  'blocking',
  'Guest roster row has no valid canonical player mapping.',
  jsonb_build_object(
    'game_id', roster.game_id,
    'guest_hooper_id', roster.guest_hooper_id,
    'source_player_id', guest.source_player_id
  )
from public.game_guest_rosters roster
left join public.guest_hoopers guest on guest.id = roster.guest_hooper_id
left join public.players player on player.id = guest.source_player_id
where player.id is null
on conflict (issue_key) do update
set details = excluded.details, status = 'open', updated_at = now();

-- If an official roster row already represents the same game/person, preserve
-- it and record the legacy mapping. Otherwise add one canonical roster row.
insert into public.game_rosters (
  game_id,
  player_id,
  roster_role,
  roster_status,
  notes,
  participation_role,
  team_side,
  legacy_guest_roster_id,
  canonicalized_at
)
select
  legacy.game_id,
  guest.source_player_id,
  coalesce(legacy.roster_role, 'bench'),
  coalesce(legacy.roster_status, 'confirmed'),
  legacy.notes,
  'guest',
  coalesce(nullif(to_jsonb(legacy)->>'team_side', ''), 'home'),
  legacy.id::text,
  now()
from public.game_guest_rosters legacy
join public.guest_hoopers guest on guest.id = legacy.guest_hooper_id
join public.players player on player.id = guest.source_player_id
where not exists (
  select 1
  from public.game_rosters canonical
  where canonical.game_id::text = legacy.game_id::text
    and canonical.player_id = guest.source_player_id
)
  and not exists (
    select 1
    from public.game_rosters canonical
    where canonical.legacy_guest_roster_id = legacy.id::text
  );

with canonical_matches as (
  select distinct on (legacy.id)
    legacy.id as legacy_id,
    canonical.id as canonical_id,
    guest.source_player_id
  from public.game_guest_rosters legacy
  join public.guest_hoopers guest on guest.id = legacy.guest_hooper_id
  join public.game_rosters canonical
    on canonical.game_id::text = legacy.game_id::text
   and canonical.player_id = guest.source_player_id
  order by legacy.id, canonical.created_at nulls last, canonical.id
)
insert into public.legacy_record_mappings (
  migration_key, source_table, source_id, target_table, target_id,
  canonical_player_id, metadata
)
select
  'M03', 'game_guest_rosters', legacy_id::text, 'game_rosters',
  canonical_id::text, source_player_id,
  jsonb_build_object('legacy_preserved', true)
from canonical_matches
on conflict (migration_key, source_table, source_id, target_table) do update
set target_id = excluded.target_id,
    canonical_player_id = excluded.canonical_player_id,
    metadata = excluded.metadata;

-- Existing duplicate game/person rows remain untouched and enter review.
insert into public.migration_review_issues (
  issue_key, issue_type, source_table, severity, summary, details
)
select
  'M03:duplicate_roster:' || md5(game_id::text || ':' || player_id::text),
  'duplicate_game_person_participation',
  'game_rosters',
  'blocking',
  'More than one canonical roster row exists for the same game and person.',
  jsonb_build_object('game_id', game_id, 'player_id', player_id, 'row_ids', array_agg(id order by id))
from public.game_rosters
group by game_id, player_id
having count(*) > 1
on conflict (issue_key) do update
set details = excluded.details, status = 'open', updated_at = now();

-- Add the final uniqueness guard only when the live data is already clean.
do $$
begin
  if not exists (
    select 1
    from public.game_rosters
    group by game_id, player_id
    having count(*) > 1
  ) then
    create unique index if not exists game_rosters_game_player_unique
      on public.game_rosters(game_id, player_id);
  end if;
end;
$$;

create table if not exists public.roster_import_batches (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  file_name text not null,
  file_hash text,
  status text not null default 'staged',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  committed_by uuid references auth.users(id) on delete set null,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('staged','validated','blocked','committed','cancelled')),
  check (total_rows >= 0 and valid_rows >= 0 and error_rows >= 0)
);

create table if not exists public.roster_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.roster_import_batches(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null default '{}'::jsonb,
  display_name text,
  normalized_name text,
  candidate_player_id uuid references public.players(id) on delete set null,
  match_status text not null default 'unmatched',
  match_confidence numeric(5,2),
  jersey_number text,
  roster_role text,
  roster_status text,
  validation_errors jsonb not null default '[]'::jsonb,
  committed_roster_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, row_number),
  check (row_number > 0),
  check (match_status in ('exact','likely','ambiguous','unmatched','rejected')),
  check (match_confidence is null or match_confidence between 0 and 100)
);

create index if not exists roster_import_batches_game_status_idx
  on public.roster_import_batches(game_id, status, created_at desc);
create index if not exists roster_import_rows_batch_status_idx
  on public.roster_import_rows(batch_id, match_status, row_number);

alter table public.roster_import_batches enable row level security;
alter table public.roster_import_rows enable row level security;

drop policy if exists "Roster admins manage import batches" on public.roster_import_batches;
create policy "Roster admins manage import batches"
  on public.roster_import_batches for all to authenticated
  using (public.has_admin_permission('rosters'))
  with check (public.has_admin_permission('rosters'));

drop policy if exists "Roster admins manage import rows" on public.roster_import_rows;
create policy "Roster admins manage import rows"
  on public.roster_import_rows for all to authenticated
  using (
    exists (
      select 1 from public.roster_import_batches batch
      where batch.id = batch_id and public.has_admin_permission('rosters')
    )
  )
  with check (
    exists (
      select 1 from public.roster_import_batches batch
      where batch.id = batch_id and public.has_admin_permission('rosters')
    )
  );

grant select, insert, update, delete on public.roster_import_batches, public.roster_import_rows to authenticated;

drop trigger if exists phase0_admin_audit_trigger on public.roster_import_batches;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.roster_import_batches
for each row execute function public.capture_admin_row_audit('roster_import_batches', 'rosters');
drop trigger if exists phase0_admin_audit_trigger on public.roster_import_rows;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.roster_import_rows
for each row execute function public.capture_admin_row_audit('roster_import_rows', 'rosters');

comment on column public.game_rosters.roster_role is
  'Canonical lineup role retained for backwards compatibility; no duplicate lineup_role column is introduced.';
comment on column public.game_rosters.roster_status is
  'Canonical participation status retained for backwards compatibility; no duplicate status column is introduced.';
comment on table public.game_guest_rosters is
  'Legacy guest participation source retained during the rollback window. New Phase 1 writes will use game_rosters.';

commit;
