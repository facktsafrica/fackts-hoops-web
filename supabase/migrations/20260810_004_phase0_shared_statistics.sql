-- FACKTS Hoops Admin Rebuild - Phase 0 / M04
-- Shared statistics foundation. public.player_game_stats remains the one
-- canonical game-stat table. Legacy guest stats remain intact for rollback.

begin;

alter table public.player_game_stats
  add column if not exists offensive_rebounds integer not null default 0,
  add column if not exists defensive_rebounds integer not null default 0,
  add column if not exists turnovers integer not null default 0,
  add column if not exists fouls integer not null default 0,
  add column if not exists minutes numeric not null default 0,
  add column if not exists two_made integer not null default 0,
  add column if not exists two_attempted integer not null default 0,
  add column if not exists three_made integer not null default 0,
  add column if not exists three_attempted integer not null default 0,
  add column if not exists ft_made integer not null default 0,
  add column if not exists ft_attempted integer not null default 0,
  add column if not exists three_pointers_made integer not null default 0,
  add column if not exists q1 integer not null default 0,
  add column if not exists q2 integer not null default 0,
  add column if not exists q3 integer not null default 0,
  add column if not exists q4 integer not null default 0,
  add column if not exists player_of_game boolean not null default false,
  add column if not exists team_side text not null default 'home',
  add column if not exists period_values jsonb not null default '{}'::jsonb,
  add column if not exists extra_stats jsonb not null default '{}'::jsonb,
  add column if not exists entry_status text not null default 'draft',
  add column if not exists autosave_version bigint not null default 0,
  add column if not exists last_saved_at timestamptz,
  add column if not exists saved_by uuid references auth.users(id) on delete set null,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists source_guest_stat_id text,
  add column if not exists source_guest_hooper_id uuid references public.guest_hoopers(id) on delete set null,
  add column if not exists canonicalized_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.player_game_stats
  drop constraint if exists player_game_stats_entry_status_check,
  drop constraint if exists player_game_stats_verification_status_check,
  drop constraint if exists player_game_stats_team_side_check;

alter table public.player_game_stats
  add constraint player_game_stats_entry_status_check
    check (entry_status in ('draft','submitted','verified','disputed','superseded')),
  add constraint player_game_stats_verification_status_check
    check (verification_status in ('unverified','pending','verified','disputed')),
  add constraint player_game_stats_team_side_check
    check (team_side in ('home','away','neutral'));

create unique index if not exists player_game_stats_source_guest_unique
  on public.player_game_stats(source_guest_stat_id)
  where source_guest_stat_id is not null;
create index if not exists player_game_stats_entry_status_idx
  on public.player_game_stats(entry_status, verification_status, last_saved_at desc);

-- Any guest stat that still lacks a canonical person remains visible in its
-- legacy table and is queued for review.
insert into public.migration_review_issues (
  issue_key, issue_type, source_table, source_id, target_table, severity, summary, details
)
select
  'M04:guest_stat_unmapped:' || legacy.id::text,
  'unmapped_guest_stat',
  'guest_game_stats',
  legacy.id::text,
  'player_game_stats',
  'blocking',
  'Guest statistic row has no valid canonical player mapping.',
  jsonb_build_object(
    'game_id', legacy.game_id,
    'guest_hooper_id', legacy.guest_hooper_id,
    'source_player_id', guest.source_player_id
  )
from public.guest_game_stats legacy
left join public.guest_hoopers guest on guest.id = legacy.guest_hooper_id
left join public.players player on player.id = guest.source_player_id
where player.id is null
on conflict (issue_key) do update
set details = excluded.details, status = 'open', updated_at = now();

-- Existing canonical rows win. Conflicting legacy rows are queued and are not
-- added a second time.
insert into public.migration_review_issues (
  issue_key, issue_type, source_table, source_id, target_table, target_id,
  severity, summary, details
)
select
  'M04:stat_conflict:' || legacy.id::text,
  'duplicate_game_person_stat',
  'guest_game_stats',
  legacy.id::text,
  'player_game_stats',
  canonical.id::text,
  'blocking',
  'Official and guest statistic rows resolve to the same game and canonical person. No automatic merge was performed.',
  jsonb_build_object(
    'game_id', legacy.game_id,
    'canonical_player_id', guest.source_player_id,
    'legacy_values', to_jsonb(legacy),
    'canonical_values', to_jsonb(canonical)
  )
from public.guest_game_stats legacy
join public.guest_hoopers guest on guest.id = legacy.guest_hooper_id
join public.player_game_stats canonical
  on canonical.game_id::text = legacy.game_id::text
 and canonical.player_id = guest.source_player_id
where canonical.source_guest_stat_id is distinct from legacy.id::text
on conflict (issue_key) do update
set target_id = excluded.target_id,
    details = excluded.details,
    status = 'open',
    updated_at = now();

insert into public.player_game_stats (
  game_id, player_id, points, rebounds, assists, steals, blocks, turnovers,
  fouls, three_pointers_made, three_made, plus_minus, player_of_game,
  team_side, extra_stats, entry_status, autosave_version, last_saved_at,
  verification_status, source_guest_stat_id, source_guest_hooper_id,
  canonicalized_at
)
select
  legacy.game_id,
  guest.source_player_id,
  coalesce(legacy.points, 0),
  coalesce(legacy.rebounds, 0),
  coalesce(legacy.assists, 0),
  coalesce(legacy.steals, 0),
  coalesce(legacy.blocks, 0),
  coalesce(legacy.turnovers, 0),
  coalesce(legacy.fouls, 0),
  coalesce(legacy.three_pointers_made, 0),
  coalesce(legacy.three_pointers_made, 0),
  coalesce(legacy.plus_minus, 0),
  coalesce(legacy.is_player_of_the_game, false),
  coalesce(nullif(to_jsonb(legacy)->>'team_side', ''), 'home'),
  jsonb_build_object('legacy_notes', to_jsonb(legacy)->>'notes'),
  'submitted',
  1,
  coalesce(
    nullif(to_jsonb(legacy)->>'updated_at', '')::timestamptz,
    nullif(to_jsonb(legacy)->>'created_at', '')::timestamptz,
    now()
  ),
  'unverified',
  legacy.id::text,
  legacy.guest_hooper_id,
  now()
from public.guest_game_stats legacy
join public.guest_hoopers guest on guest.id = legacy.guest_hooper_id
join public.players player on player.id = guest.source_player_id
where not exists (
  select 1
  from public.player_game_stats canonical
  where canonical.game_id::text = legacy.game_id::text
    and canonical.player_id = guest.source_player_id
)
  and not exists (
    select 1
    from public.player_game_stats canonical
    where canonical.source_guest_stat_id = legacy.id::text
  );

with canonical_matches as (
  select distinct on (legacy.id)
    legacy.id as legacy_id,
    canonical.id as canonical_id,
    guest.source_player_id
  from public.guest_game_stats legacy
  join public.guest_hoopers guest on guest.id = legacy.guest_hooper_id
  join public.player_game_stats canonical
    on canonical.game_id::text = legacy.game_id::text
   and canonical.player_id = guest.source_player_id
  order by legacy.id, canonical.created_at nulls last, canonical.id
)
insert into public.legacy_record_mappings (
  migration_key, source_table, source_id, target_table, target_id,
  canonical_player_id, metadata
)
select
  'M04', 'guest_game_stats', legacy_id::text, 'player_game_stats',
  canonical_id::text, source_player_id,
  jsonb_build_object('legacy_preserved', true)
from canonical_matches
on conflict (migration_key, source_table, source_id, target_table) do update
set target_id = excluded.target_id,
    canonical_player_id = excluded.canonical_player_id,
    metadata = excluded.metadata;

insert into public.migration_review_issues (
  issue_key, issue_type, source_table, severity, summary, details
)
select
  'M04:duplicate_canonical_stat:' || md5(game_id::text || ':' || player_id::text),
  'duplicate_game_person_stat',
  'player_game_stats',
  'blocking',
  'More than one canonical statistic row exists for the same game and person.',
  jsonb_build_object('game_id', game_id, 'player_id', player_id, 'row_ids', array_agg(id order by id))
from public.player_game_stats
group by game_id, player_id
having count(*) > 1
on conflict (issue_key) do update
set details = excluded.details, status = 'open', updated_at = now();

do $$
begin
  if not exists (
    select 1
    from public.player_game_stats
    group by game_id, player_id
    having count(*) > 1
  ) then
    create unique index if not exists player_game_stats_game_player_unique
      on public.player_game_stats(game_id, player_id);
  end if;
end;
$$;

create table if not exists public.stat_field_definitions (
  field_key text primary key,
  label text not null,
  data_type text not null default 'integer',
  is_core boolean not null default true,
  minimum_value numeric,
  maximum_value numeric,
  display_order integer not null default 100,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (field_key ~ '^[a-z0-9_]+$'),
  check (data_type in ('integer','decimal','boolean','duration','json')),
  check (maximum_value is null or minimum_value is null or maximum_value >= minimum_value)
);

create table if not exists public.competition_stat_fields (
  id uuid primary key default gen_random_uuid(),
  game_format text not null,
  field_key text not null references public.stat_field_definitions(field_key) on delete restrict,
  is_required boolean not null default false,
  is_visible boolean not null default true,
  display_order integer not null default 100,
  validation_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_format, field_key),
  check (game_format in ('1v1','2v2','3v3','5v5','custom'))
);

insert into public.stat_field_definitions
  (field_key, label, data_type, is_core, minimum_value, display_order)
values
  ('points','Points','integer',true,0,10),
  ('rebounds','Rebounds','integer',true,0,20),
  ('assists','Assists','integer',true,0,30),
  ('steals','Steals','integer',true,0,40),
  ('blocks','Blocks','integer',true,0,50),
  ('turnovers','Turnovers','integer',true,0,60),
  ('fouls','Fouls','integer',true,0,70),
  ('minutes','Minutes','decimal',true,0,80),
  ('plus_minus','Plus / Minus','integer',true,null,90),
  ('two_made','2PT Made','integer',true,0,100),
  ('two_attempted','2PT Attempted','integer',true,0,110),
  ('three_made','3PT Made','integer',true,0,120),
  ('three_attempted','3PT Attempted','integer',true,0,130),
  ('ft_made','FT Made','integer',true,0,140),
  ('ft_attempted','FT Attempted','integer',true,0,150)
on conflict (field_key) do update
set label = excluded.label,
    data_type = excluded.data_type,
    is_core = excluded.is_core,
    minimum_value = excluded.minimum_value,
    display_order = excluded.display_order,
    updated_at = now();

insert into public.competition_stat_fields (game_format, field_key, is_required, display_order)
select format.game_format, definition.field_key, definition.field_key = 'points', definition.display_order
from (values ('1v1'),('2v2'),('3v3'),('5v5'),('custom')) format(game_format)
cross join public.stat_field_definitions definition
where definition.is_active = true
on conflict (game_format, field_key) do nothing;

alter table public.stat_field_definitions enable row level security;
alter table public.competition_stat_fields enable row level security;

drop policy if exists "Admins read stat definitions" on public.stat_field_definitions;
create policy "Admins read stat definitions"
  on public.stat_field_definitions for select to authenticated
  using (public.has_admin_any_permission(array['stats','guest_game_stats','one_on_one'], null, null, false));
drop policy if exists "Directors manage stat definitions" on public.stat_field_definitions;
create policy "Directors manage stat definitions"
  on public.stat_field_definitions for all to authenticated
  using (public.has_admin_permission('admin_users'))
  with check (public.has_admin_permission('admin_users'));

drop policy if exists "Admins read competition stat fields" on public.competition_stat_fields;
create policy "Admins read competition stat fields"
  on public.competition_stat_fields for select to authenticated
  using (public.has_admin_any_permission(array['stats','guest_game_stats','one_on_one'], null, null, false));
drop policy if exists "Directors manage competition stat fields" on public.competition_stat_fields;
create policy "Directors manage competition stat fields"
  on public.competition_stat_fields for all to authenticated
  using (public.has_admin_permission('admin_users'))
  with check (public.has_admin_permission('admin_users'));

grant select on public.stat_field_definitions, public.competition_stat_fields to authenticated;
grant insert, update, delete on public.stat_field_definitions, public.competition_stat_fields to authenticated;

drop trigger if exists phase0_admin_audit_trigger on public.stat_field_definitions;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.stat_field_definitions
for each row execute function public.capture_admin_row_audit('stat_field_definitions', 'stats');
drop trigger if exists phase0_admin_audit_trigger on public.competition_stat_fields;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.competition_stat_fields
for each row execute function public.capture_admin_row_audit('competition_stat_fields', 'stats');

comment on table public.guest_game_stats is
  'Legacy guest statistic source retained for rollback. New Phase 1 writes will use player_game_stats.';
comment on table public.competition_stat_fields is
  'Display and validation configuration for the one shared statistics engine; it is not a separate statistics store.';

commit;
