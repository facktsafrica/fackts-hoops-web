-- FACKTS Hoops Admin Rebuild - Phase 0 / M07
-- Adds operational event records beneath the existing event_case_studies parent.
-- Existing public event pages and event_records remain unchanged.

begin;

create table if not exists public.event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.event_case_studies(event_id) on delete cascade,
  entry_type text not null check (entry_type in ('team','person')),
  team_id uuid references public.team_profiles(id) on delete restrict,
  player_id uuid references public.players(id) on delete restrict,
  display_name_snapshot text not null check (length(trim(display_name_snapshot)) > 0),
  division text,
  entry_status text not null default 'pending'
    check (entry_status in ('pending','confirmed','waitlisted','withdrawn','disqualified','completed')),
  legacy_source_table text,
  legacy_source_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_profiles(id) on delete set null,
  updated_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (team_id is not null and player_id is not null)),
  check ((entry_type = 'team' and player_id is null) or (entry_type = 'person' and team_id is null))
);

create unique index if not exists event_entries_legacy_source_unique
  on public.event_entries(legacy_source_table, legacy_source_id)
  where legacy_source_table is not null and legacy_source_id is not null;
create index if not exists event_entries_event_status_idx
  on public.event_entries(event_id, entry_status, division);
create index if not exists event_entries_team_idx
  on public.event_entries(team_id) where team_id is not null;
create index if not exists event_entries_player_idx
  on public.event_entries(player_id) where player_id is not null;

create table if not exists public.event_setup_progress (
  event_id text primary key references public.event_case_studies(event_id) on delete cascade,
  current_stage text not null default 'event_details',
  completed_stages text[] not null default '{}'::text[],
  validation_status text not null default 'needs_review'
    check (validation_status in ('needs_review','valid','blocked')),
  validation_errors jsonb not null default '[]'::jsonb
    check (jsonb_typeof(validation_errors) = 'array'),
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_deliverables (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.event_case_studies(event_id) on delete cascade,
  service_type text not null,
  title text not null check (length(trim(title)) > 0),
  description text,
  owner_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  due_at timestamptz,
  deliverable_status text not null default 'planned'
    check (deliverable_status in ('planned','in_progress','blocked','ready_for_review','delivered','cancelled')),
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_profiles(id) on delete set null,
  updated_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_deliverables_event_status_idx
  on public.event_deliverables(event_id, deliverable_status, due_at);

drop trigger if exists event_entries_touch_updated_at on public.event_entries;
create trigger event_entries_touch_updated_at
before update on public.event_entries
for each row execute function public.phase0_touch_updated_at();

drop trigger if exists event_setup_progress_touch_updated_at on public.event_setup_progress;
create trigger event_setup_progress_touch_updated_at
before update on public.event_setup_progress
for each row execute function public.phase0_touch_updated_at();

drop trigger if exists event_deliverables_touch_updated_at on public.event_deliverables;
create trigger event_deliverables_touch_updated_at
before update on public.event_deliverables
for each row execute function public.phase0_touch_updated_at();

insert into public.event_entries (
  event_id, entry_type, display_name_snapshot, division, entry_status,
  legacy_source_table, legacy_source_id, metadata
)
select
  record.event_id,
  record.record_type,
  coalesce(nullif(trim(record.team_name), ''), nullif(trim(record.title), ''), 'Legacy event entry'),
  record.division,
  case record.status
    when 'verified' then 'confirmed'
    when 'published' then 'confirmed'
    when 'withdrawn' then 'withdrawn'
    else 'pending'
  end,
  'event_records',
  record.id::text,
  jsonb_build_object(
    'legacy_status', record.status,
    'legacy_is_public', record.is_public,
    'identity_resolution', 'display_snapshot_only',
    'name_only_match_attempted', false
  )
from public.event_records record
where record.record_type in ('team','person')
on conflict (legacy_source_table, legacy_source_id) where legacy_source_table is not null and legacy_source_id is not null
do update set
  display_name_snapshot = excluded.display_name_snapshot,
  division = excluded.division,
  metadata = public.event_entries.metadata || excluded.metadata,
  updated_at = now();

insert into public.legacy_record_mappings (
  migration_key, source_table, source_id, target_table, target_id, metadata
)
select
  'M07', 'event_records', entry.legacy_source_id,
  'event_entries', entry.id::text,
  jsonb_build_object('identity_resolution', 'display_snapshot_only')
from public.event_entries entry
where entry.legacy_source_table = 'event_records'
on conflict (migration_key, source_table, source_id, target_table) do update
set target_id = excluded.target_id, metadata = excluded.metadata;

insert into public.event_setup_progress (
  event_id, current_stage, completed_stages, validation_status, validation_errors, metadata
)
select
  event.event_id,
  'legacy_review',
  array['legacy_import'],
  'needs_review',
  jsonb_build_array(jsonb_build_object(
    'code', 'legacy_event_requires_setup_review',
    'message', 'Existing event preserved; operational setup must be reviewed before workflow cutover.'
  )),
  jsonb_build_object('legacy_event_preserved', true, 'public_reads_switched', false)
from public.event_case_studies event
on conflict (event_id) do nothing;

alter table public.event_entries enable row level security;
alter table public.event_setup_progress enable row level security;
alter table public.event_deliverables enable row level security;

drop policy if exists "Event admins read entries" on public.event_entries;
create policy "Event admins read entries"
  on public.event_entries for select to authenticated
  using (public.has_admin_any_permission(array['events','calendar','activity'], 'event', event_id, false));

drop policy if exists "Event admins manage entries" on public.event_entries;
create policy "Event admins manage entries"
  on public.event_entries for all to authenticated
  using (public.has_admin_any_permission(array['events','calendar'], 'event', event_id, true))
  with check (public.has_admin_any_permission(array['events','calendar'], 'event', event_id, true));

drop policy if exists "Event admins read setup progress" on public.event_setup_progress;
create policy "Event admins read setup progress"
  on public.event_setup_progress for select to authenticated
  using (public.has_admin_any_permission(array['events','calendar','activity'], 'event', event_id, false));

drop policy if exists "Event admins manage setup progress" on public.event_setup_progress;
create policy "Event admins manage setup progress"
  on public.event_setup_progress for all to authenticated
  using (public.has_admin_any_permission(array['events','calendar'], 'event', event_id, true))
  with check (public.has_admin_any_permission(array['events','calendar'], 'event', event_id, true));

drop policy if exists "Event admins read deliverables" on public.event_deliverables;
create policy "Event admins read deliverables"
  on public.event_deliverables for select to authenticated
  using (public.has_admin_any_permission(array['events','reports','activity'], 'event', event_id, false));

drop policy if exists "Event admins manage deliverables" on public.event_deliverables;
create policy "Event admins manage deliverables"
  on public.event_deliverables for all to authenticated
  using (public.has_admin_permission('events', 'event', event_id, true))
  with check (public.has_admin_permission('events', 'event', event_id, true));

grant select, insert, update, delete on
  public.event_entries, public.event_setup_progress, public.event_deliverables
to authenticated;

drop trigger if exists phase0_admin_audit_trigger on public.event_entries;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.event_entries
for each row execute function public.capture_admin_row_audit('event_entries', 'events');
drop trigger if exists phase0_admin_audit_trigger on public.event_setup_progress;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.event_setup_progress
for each row execute function public.capture_admin_row_audit('event_setup_progress', 'events');
drop trigger if exists phase0_admin_audit_trigger on public.event_deliverables;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.event_deliverables
for each row execute function public.capture_admin_row_audit('event_deliverables', 'events');

comment on table public.event_entries is
  'Operational entries under event_case_studies. Phase 0 legacy imports use display snapshots and never name-only identity merges.';
comment on table public.event_setup_progress is
  'Server-validatable event setup workflow state. Existing events start in needs_review without changing their public status.';
comment on table public.event_deliverables is
  'Event service commitments, owners, deadlines and evidence; no Phase 1 UI is introduced here.';

commit;
