-- FACKTS Hoops Admin Rebuild - Phase 0 / M02
-- Canonical person mapping. public.players remains the one person table.
-- Legacy guest rows remain present and readable for rollback compatibility.

begin;

create extension if not exists pgcrypto;

create table if not exists public.migration_review_issues (
  id uuid primary key default gen_random_uuid(),
  issue_key text not null unique,
  issue_type text not null,
  source_table text,
  source_id text,
  target_table text,
  target_id text,
  severity text not null default 'warning',
  status text not null default 'open',
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (severity in ('info','warning','blocking')),
  check (status in ('open','in_review','resolved','ignored'))
);

create table if not exists public.legacy_identity_aliases (
  id uuid primary key default gen_random_uuid(),
  legacy_source text not null,
  legacy_id text not null,
  legacy_route_id text,
  canonical_player_id uuid not null references public.players(id) on delete restrict,
  alias_type text not null default 'legacy_profile',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source, legacy_id),
  unique (legacy_route_id),
  check (legacy_source in ('players','guest_hoopers','one_on_one_external','team_roster_name','import')),
  check (length(trim(legacy_id)) > 0)
);

create table if not exists public.legacy_record_mappings (
  id uuid primary key default gen_random_uuid(),
  migration_key text not null,
  source_table text not null,
  source_id text not null,
  target_table text not null,
  target_id text not null,
  canonical_player_id uuid references public.players(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (migration_key, source_table, source_id, target_table),
  check (length(trim(source_id)) > 0),
  check (length(trim(target_id)) > 0)
);

create index if not exists legacy_identity_aliases_player_idx
  on public.legacy_identity_aliases(canonical_player_id, is_active);
create index if not exists legacy_record_mappings_player_idx
  on public.legacy_record_mappings(canonical_player_id, migration_key);
create index if not exists migration_review_issues_status_idx
  on public.migration_review_issues(status, severity, issue_type, created_at);

-- Every existing player row is already canonical and receives a stable alias.
insert into public.legacy_identity_aliases (
  legacy_source, legacy_id, legacy_route_id, canonical_player_id, alias_type, metadata
)
select
  'players', p.id::text, p.id::text, p.id, 'canonical_player',
  jsonb_build_object('phase', 'M02', 'existing_canonical', true)
from public.players p
on conflict (legacy_source, legacy_id) do update
set canonical_player_id = excluded.canonical_player_id,
    is_active = true,
    updated_at = now();

-- Preserve valid pre-existing player links before creating anything new.
insert into public.legacy_identity_aliases (
  legacy_source, legacy_id, legacy_route_id, canonical_player_id, alias_type, metadata
)
select
  'guest_hoopers', g.id::text, 'guest-' || g.id::text, g.source_player_id,
  'legacy_guest_profile', jsonb_build_object('phase', 'M02', 'preexisting_link', true)
from public.guest_hoopers g
join public.players p on p.id = g.source_player_id
where g.source_player_id is not null
on conflict (legacy_source, legacy_id) do update
set canonical_player_id = excluded.canonical_player_id,
    legacy_route_id = excluded.legacy_route_id,
    is_active = true,
    updated_at = now();

-- Invalid existing links are never overwritten silently.
insert into public.migration_review_issues (
  issue_key, issue_type, source_table, source_id, severity, summary, details
)
select
  'M02:guest_missing_player:' || g.id::text,
  'orphan_identity_link',
  'guest_hoopers',
  g.id::text,
  'blocking',
  'Guest profile points to a player row that does not exist.',
  jsonb_build_object('source_player_id', g.source_player_id)
from public.guest_hoopers g
left join public.players p on p.id = g.source_player_id
where g.source_player_id is not null and p.id is null
on conflict (issue_key) do update
set details = excluded.details, status = 'open', updated_at = now();

-- A direct guest without a source link becomes its own canonical players row.
-- No name matching is used, so two different people are never merged merely
-- because their names resemble each other. The existing guest row is retained.
do $$
declare
  guest_record record;
  canonical_id uuid;
  sync_trigger_exists boolean;
begin
  select exists (
    select 1 from pg_trigger
    where tgrelid = 'public.players'::regclass
      and tgname = 'sync_linked_guest_identity_trigger'
      and not tgisinternal
  ) into sync_trigger_exists;

  if sync_trigger_exists then
    alter table public.players disable trigger sync_linked_guest_identity_trigger;
  end if;

  for guest_record in
    select *
    from public.guest_hoopers g
    where g.source_player_id is null
    order by g.created_at nulls last, g.id
    for update
  loop
    insert into public.players (
      full_name, name, nickname, position, photo_url, photo_position, bio,
      role, player_type, is_active, created_at, updated_at
    ) values (
      coalesce(nullif(trim(guest_record.full_name), ''), nullif(trim(guest_record.nickname), ''), 'Guest Hooper'),
      coalesce(nullif(trim(guest_record.full_name), ''), nullif(trim(guest_record.nickname), ''), 'Guest Hooper'),
      guest_record.nickname,
      guest_record.position,
      guest_record.photo_url,
      coalesce(nullif(guest_record.photo_position, ''), 'center center'),
      guest_record.notes,
      'Guest Hooper',
      case when guest_record.guest_type = 'external_player' then 'external_player' else 'guest_hooper' end,
      coalesce(guest_record.is_active, true),
      coalesce(guest_record.created_at, now()),
      now()
    ) returning id into canonical_id;

    update public.guest_hoopers
    set source_player_id = canonical_id
    where id = guest_record.id and source_player_id is null;

    insert into public.legacy_identity_aliases (
      legacy_source, legacy_id, legacy_route_id, canonical_player_id, alias_type, metadata
    ) values (
      'guest_hoopers', guest_record.id::text, 'guest-' || guest_record.id::text,
      canonical_id, 'legacy_guest_profile',
      jsonb_build_object('phase', 'M02', 'canonical_row_created', true)
    )
    on conflict (legacy_source, legacy_id) do update
    set canonical_player_id = excluded.canonical_player_id,
        legacy_route_id = excluded.legacy_route_id,
        is_active = true,
        updated_at = now();
  end loop;

  if sync_trigger_exists then
    alter table public.players enable trigger sync_linked_guest_identity_trigger;
  end if;
end;
$$;

-- Suspected duplicates are queued for a human decision; they are not merged.
with identities as (
  select
    p.id,
    regexp_replace(
      lower(trim(coalesce(nullif(p.full_name, ''), nullif(p.name, ''), nullif(p.nickname, '')))),
      '[^a-z0-9]+', '', 'g'
    ) as normalized_name
  from public.players p
), duplicate_groups as (
  select normalized_name, array_agg(id order by id) as player_ids
  from identities
  where normalized_name <> ''
  group by normalized_name
  having count(*) > 1
)
insert into public.migration_review_issues (
  issue_key, issue_type, source_table, severity, summary, details
)
select
  'M02:duplicate_name:' || md5(normalized_name),
  'possible_duplicate_identity',
  'players',
  'warning',
  'Multiple canonical people share the same normalized name. Review manually; no merge was performed.',
  jsonb_build_object('normalized_name', normalized_name, 'player_ids', player_ids)
from duplicate_groups
on conflict (issue_key) do update
set details = excluded.details, updated_at = now();

create or replace function public.resolve_legacy_player_alias(
  p_legacy_source text,
  p_legacy_id text
)
returns table(canonical_player_id uuid, canonical_route_id text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select alias.canonical_player_id, alias.canonical_player_id::text
  from public.legacy_identity_aliases alias
  join public.players player on player.id = alias.canonical_player_id
  where alias.legacy_source = p_legacy_source
    and alias.legacy_id = p_legacy_id
    and alias.is_active = true
  limit 1;
$$;

alter table public.migration_review_issues enable row level security;
alter table public.legacy_identity_aliases enable row level security;
alter table public.legacy_record_mappings enable row level security;

drop policy if exists "Authorized admins read migration issues" on public.migration_review_issues;
create policy "Authorized admins read migration issues"
  on public.migration_review_issues for select to authenticated
  using (public.has_admin_any_permission(array['audit','admin_users'], null, null, false));
drop policy if exists "Directors manage migration issues" on public.migration_review_issues;
create policy "Directors manage migration issues"
  on public.migration_review_issues for all to authenticated
  using (public.has_admin_permission('admin_users'))
  with check (public.has_admin_permission('admin_users'));

drop policy if exists "Authorized admins read identity aliases" on public.legacy_identity_aliases;
create policy "Authorized admins read identity aliases"
  on public.legacy_identity_aliases for select to authenticated
  using (public.has_admin_any_permission(array['players','guest_hoopers','audit'], null, null, false));
drop policy if exists "Directors manage identity aliases" on public.legacy_identity_aliases;
create policy "Directors manage identity aliases"
  on public.legacy_identity_aliases for all to authenticated
  using (public.has_admin_permission('admin_users'))
  with check (public.has_admin_permission('admin_users'));

drop policy if exists "Authorized admins read legacy mappings" on public.legacy_record_mappings;
create policy "Authorized admins read legacy mappings"
  on public.legacy_record_mappings for select to authenticated
  using (public.has_admin_any_permission(array['audit','players','games','stats','media'], null, null, false));
drop policy if exists "Directors manage legacy mappings" on public.legacy_record_mappings;
create policy "Directors manage legacy mappings"
  on public.legacy_record_mappings for all to authenticated
  using (public.has_admin_permission('admin_users'))
  with check (public.has_admin_permission('admin_users'));

grant select on public.migration_review_issues, public.legacy_identity_aliases, public.legacy_record_mappings to authenticated;
grant execute on function public.resolve_legacy_player_alias(text, text) to anon, authenticated;

drop trigger if exists phase0_admin_audit_trigger on public.migration_review_issues;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.migration_review_issues
for each row execute function public.capture_admin_row_audit('migration_review_issues', 'admin_users');
drop trigger if exists phase0_admin_audit_trigger on public.legacy_identity_aliases;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.legacy_identity_aliases
for each row execute function public.capture_admin_row_audit('legacy_identity_aliases', 'players');
drop trigger if exists phase0_admin_audit_trigger on public.legacy_record_mappings;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.legacy_record_mappings
for each row execute function public.capture_admin_row_audit('legacy_record_mappings', 'audit');

comment on table public.legacy_identity_aliases is
  'Compatibility map from old player/guest route IDs to the canonical public.players identity.';
comment on table public.migration_review_issues is
  'Human review queue for ambiguous or conflicting Phase 0 data. It is not a player, stats or media store.';

commit;
