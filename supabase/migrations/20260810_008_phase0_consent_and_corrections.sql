-- FACKTS Hoops Admin Rebuild - Phase 0 / M08
-- Adds governed consent and correction workflows while retaining legacy status fields.
-- Historical consent labels are never promoted into verified releases automatically.

begin;

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete restrict,
  event_id text references public.event_case_studies(event_id) on delete set null,
  application_id text,
  subject_label_snapshot text,
  subject_type text not null default 'adult'
    check (subject_type in ('adult','minor','guardian','team_group','official','volunteer','other')),
  guardian_name text,
  guardian_contact text,
  consent_scopes text[] not null default '{}'::text[],
  consent_status text not null default 'pending'
    check (consent_status in ('pending','approved','restricted','withdrawn','expired','rejected')),
  capture_method text not null default 'legacy_status'
    check (capture_method in ('legacy_status','application','document','digital_form','admin_record','other')),
  captured_at timestamptz,
  effective_from timestamptz,
  expires_at timestamptz,
  evidence_reference text,
  restrictions text,
  legacy_self_attested boolean not null default false,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  private_notes text,
  legacy_source_table text,
  legacy_source_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_profiles(id) on delete set null,
  updated_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (player_id is not null or nullif(trim(subject_label_snapshot), '') is not null),
  check (not (consent_status = 'approved' and legacy_self_attested)),
  check (expires_at is null or effective_from is null or expires_at >= effective_from)
);

create unique index if not exists consents_legacy_source_unique
  on public.consents(legacy_source_table, legacy_source_id)
  where legacy_source_table is not null and legacy_source_id is not null;
create index if not exists consents_player_status_idx
  on public.consents(player_id, consent_status) where player_id is not null;
create index if not exists consents_event_status_idx
  on public.consents(event_id, consent_status) where event_id is not null;

create table if not exists public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('game','player','stat','team','event','media','other')),
  entity_id text not null check (length(trim(entity_id)) > 0),
  correction_status text not null default 'open'
    check (correction_status in ('open','triaged','in_progress','resolved','rejected','cancelled')),
  summary text not null check (length(trim(summary)) > 0),
  requester_name text,
  requester_contact text,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  resolution_notes text,
  assigned_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  resolved_by uuid references public.admin_profiles(id) on delete set null,
  resolved_at timestamptz,
  legacy_source_table text,
  legacy_source_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists correction_requests_legacy_source_unique
  on public.correction_requests(legacy_source_table, legacy_source_id)
  where legacy_source_table is not null and legacy_source_id is not null;
create index if not exists correction_requests_queue_idx
  on public.correction_requests(correction_status, entity_type, updated_at desc);

create table if not exists public.correction_changes (
  id uuid primary key default gen_random_uuid(),
  correction_request_id uuid not null references public.correction_requests(id) on delete restrict,
  field_path text not null check (length(trim(field_path)) > 0),
  previous_value jsonb,
  proposed_value jsonb,
  change_status text not null default 'proposed'
    check (change_status in ('proposed','accepted','rejected','applied')),
  applied_by uuid references public.admin_profiles(id) on delete set null,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists correction_changes_request_idx
  on public.correction_changes(correction_request_id, change_status);

drop trigger if exists consents_touch_updated_at on public.consents;
create trigger consents_touch_updated_at
before update on public.consents
for each row execute function public.phase0_touch_updated_at();

drop trigger if exists correction_requests_touch_updated_at on public.correction_requests;
create trigger correction_requests_touch_updated_at
before update on public.correction_requests
for each row execute function public.phase0_touch_updated_at();

drop trigger if exists correction_changes_touch_updated_at on public.correction_changes;
create trigger correction_changes_touch_updated_at
before update on public.correction_changes
for each row execute function public.phase0_touch_updated_at();

insert into public.consents (
  player_id, subject_label_snapshot, subject_type, consent_scopes,
  consent_status, capture_method, legacy_self_attested,
  restrictions, legacy_source_table, legacy_source_id, metadata
)
select
  player.id,
  coalesce(nullif(trim(player.full_name), ''), nullif(trim(player.name), ''), nullif(trim(player.nickname), ''), 'Player'),
  'adult',
  '{}'::text[],
  case player.consent_status
    when 'restricted' then 'restricted'
    when 'withdrawn' then 'withdrawn'
    else 'pending'
  end,
  'legacy_status',
  true,
  case
    when player.consent_status = 'confirmed' then 'Legacy confirmed label requires evidence review before approval.'
    else null
  end,
  'players',
  player.id::text,
  jsonb_build_object(
    'legacy_consent_status', player.consent_status,
    'automatic_approval', false,
    'evidence_review_required', true
  )
from public.players player
where player.consent_status <> 'not_recorded'
on conflict (legacy_source_table, legacy_source_id) where legacy_source_table is not null and legacy_source_id is not null
do update set
  metadata = public.consents.metadata || excluded.metadata,
  updated_at = now();

insert into public.consents (
  player_id, subject_label_snapshot, subject_type, event_id, consent_scopes,
  consent_status, capture_method, legacy_self_attested, evidence_reference,
  restrictions, legacy_source_table, legacy_source_id, metadata
)
select
  null,
  record.title,
  case lower(coalesce(record.division, ''))
    when 'minor' then 'minor'
    when 'team / group' then 'team_group'
    when 'official' then 'official'
    when 'volunteer' then 'volunteer'
    else 'other'
  end,
  record.event_id,
  array_remove(array[nullif(record.subtitle, '')], null),
  case record.status
    when 'restricted' then 'restricted'
    when 'withdrawn' then 'withdrawn'
    else 'pending'
  end,
  'legacy_status',
  true,
  record.url,
  record.details,
  'event_records',
  record.id::text,
  jsonb_build_object(
    'legacy_status', record.status,
    'legacy_is_public', record.is_public,
    'automatic_approval', false,
    'identity_resolution', 'display_snapshot_only'
  )
from public.event_records record
where record.record_type = 'consent'
on conflict (legacy_source_table, legacy_source_id) where legacy_source_table is not null and legacy_source_id is not null
do update set
  metadata = public.consents.metadata || excluded.metadata,
  updated_at = now();

insert into public.correction_requests (
  entity_type, entity_id, correction_status, summary,
  legacy_source_table, legacy_source_id, metadata
)
select
  'game',
  game.id::text,
  case game.correction_status
    when 'corrected' then 'resolved'
    when 'open' then 'open'
    else 'triaged'
  end,
  coalesce(nullif(trim(game.correction_note), ''), 'Legacy game correction requires review.'),
  'games',
  game.id::text,
  jsonb_build_object(
    'legacy_correction_status', game.correction_status,
    'legacy_field_preserved', true
  )
from public.games game
where game.correction_status <> 'none'
on conflict (legacy_source_table, legacy_source_id) where legacy_source_table is not null and legacy_source_id is not null
do update set
  correction_status = excluded.correction_status,
  summary = excluded.summary,
  metadata = public.correction_requests.metadata || excluded.metadata,
  updated_at = now();

insert into public.legacy_record_mappings (
  migration_key, source_table, source_id, target_table, target_id, metadata
)
select 'M08', consent.legacy_source_table, consent.legacy_source_id,
  'consents', consent.id::text,
  jsonb_build_object('automatic_approval', false)
from public.consents consent
where consent.legacy_source_table is not null and consent.legacy_source_id is not null
on conflict (migration_key, source_table, source_id, target_table) do update
set target_id = excluded.target_id, metadata = excluded.metadata;

insert into public.legacy_record_mappings (
  migration_key, source_table, source_id, target_table, target_id, metadata
)
select 'M08', request.legacy_source_table, request.legacy_source_id,
  'correction_requests', request.id::text,
  jsonb_build_object('legacy_field_preserved', true)
from public.correction_requests request
where request.legacy_source_table is not null and request.legacy_source_id is not null
on conflict (migration_key, source_table, source_id, target_table) do update
set target_id = excluded.target_id, metadata = excluded.metadata;

alter table public.consents enable row level security;
alter table public.correction_requests enable row level security;
alter table public.correction_changes enable row level security;

drop policy if exists "Consent admins read consent records" on public.consents;
create policy "Consent admins read consent records"
  on public.consents for select to authenticated
  using (public.has_admin_any_permission(array['consents','activity'], 'event', event_id, false));

drop policy if exists "Consent admins manage consent records" on public.consents;
create policy "Consent admins manage consent records"
  on public.consents for all to authenticated
  using (public.has_admin_permission('consents', 'event', event_id, true))
  with check (public.has_admin_permission('consents', 'event', event_id, true));

drop policy if exists "Correction admins read requests" on public.correction_requests;
create policy "Correction admins read requests"
  on public.correction_requests for select to authenticated
  using (public.has_admin_any_permission(array['corrections','activity'], entity_type, entity_id, false));

drop policy if exists "Correction admins manage requests" on public.correction_requests;
create policy "Correction admins manage requests"
  on public.correction_requests for all to authenticated
  using (public.has_admin_permission('corrections', entity_type, entity_id, true))
  with check (public.has_admin_permission('corrections', entity_type, entity_id, true));

drop policy if exists "Correction admins read changes" on public.correction_changes;
create policy "Correction admins read changes"
  on public.correction_changes for select to authenticated
  using (exists (
    select 1 from public.correction_requests request
    where request.id = correction_request_id
      and public.has_admin_any_permission(array['corrections','activity'], request.entity_type, request.entity_id, false)
  ));

drop policy if exists "Correction admins manage changes" on public.correction_changes;
create policy "Correction admins manage changes"
  on public.correction_changes for all to authenticated
  using (exists (
    select 1 from public.correction_requests request
    where request.id = correction_request_id
      and public.has_admin_permission('corrections', request.entity_type, request.entity_id, true)
  ))
  with check (exists (
    select 1 from public.correction_requests request
    where request.id = correction_request_id
      and public.has_admin_permission('corrections', request.entity_type, request.entity_id, true)
  ));

grant select, insert, update, delete on
  public.consents, public.correction_requests, public.correction_changes
to authenticated;

drop trigger if exists phase0_admin_audit_trigger on public.consents;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.consents
for each row execute function public.capture_admin_row_audit('consents', 'consents');
drop trigger if exists phase0_admin_audit_trigger on public.correction_requests;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.correction_requests
for each row execute function public.capture_admin_row_audit('correction_requests', 'corrections');
drop trigger if exists phase0_admin_audit_trigger on public.correction_changes;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.correction_changes
for each row execute function public.capture_admin_row_audit('correction_changes', 'corrections');

comment on table public.consents is
  'Private governed consent records. Legacy labels remain self-attested and can never become approved without evidence review.';
comment on table public.correction_requests is
  'Correction workflow parent; legacy correction fields remain in place for backwards compatibility.';
comment on table public.correction_changes is
  'Field-level proposed and applied changes associated with a governed correction request.';

commit;
