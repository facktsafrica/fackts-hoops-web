-- FACKTS Hoops Admin Rebuild - Phase 0 / M01
-- Additive authorization, resource scope and immutable audit foundation.
-- Apply only after M00 has been captured and reviewed.

begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_role_presets (
  role_key text primary key,
  label text not null,
  description text,
  permissions text[] not null default '{}'::text[],
  read_only boolean not null default false,
  requires_scope boolean not null default false,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role_key = lower(role_key) and role_key ~ '^[a-z0-9_]+$')
);

insert into public.admin_role_presets
  (role_key, label, description, permissions, read_only, requires_scope)
values
  (
    'director',
    'Director',
    'Full operational authority across FACKTS Hoops Admin.',
    array[
      'ticker','players','teams','applications','player_access','games','stats',
      'calendar','events','one_on_one','match_previews','highlights','media',
      'media_stories','guest_hoopers','game_guests','guest_game_stats',
      'guest_one_on_one_stats','rosters','roster_announcements','notifications',
      'partners','email','activity','audit','consents','corrections','reports',
      'admin_users'
    ],
    false,
    false
  ),
  (
    'event_manager',
    'Event Manager',
    'Creates and operates events, games, rosters and event delivery records.',
    array['calendar','events','games','rosters','game_guests','teams','notifications','reports','consents'],
    false,
    false
  ),
  (
    'statistician',
    'Statistician',
    'Manages canonical game participation and statistics workflows.',
    array['games','rosters','game_guests','stats','guest_game_stats','one_on_one','guest_one_on_one_stats','highlights'],
    false,
    false
  ),
  (
    'media_editor',
    'Media Editor',
    'Manages approved media, highlights and public story records.',
    array['media','media_stories','highlights','players','teams','games'],
    false,
    false
  ),
  (
    'team_manager',
    'Team Manager',
    'Manages only explicitly assigned teams and their related roster records.',
    array['teams','rosters','players','games'],
    false,
    true
  ),
  (
    'organizer_viewer',
    'Organizer Viewer',
    'Reads only explicitly assigned event operations and reports.',
    array['calendar','events','games','rosters','stats','media','reports'],
    true,
    true
  ),
  (
    'read_only_partner',
    'Read-only Partner',
    'Reads only explicitly assigned partner-facing delivery and reporting records.',
    array['media','reports'],
    true,
    true
  )
on conflict (role_key) do update
set
  label = excluded.label,
  description = excluded.description,
  permissions = excluded.permissions,
  read_only = excluded.read_only,
  requires_scope = excluded.requires_scope,
  updated_at = now();

create table if not exists public.admin_assignments (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null references public.admin_profiles(id) on delete cascade,
  resource_type text not null,
  resource_id text not null,
  permissions text[] not null default '{}'::text[],
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (admin_profile_id, resource_type, resource_id),
  check (resource_type in ('event','game','team','player','media','report','partner')),
  check (length(trim(resource_id)) > 0),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists admin_assignments_profile_active_idx
  on public.admin_assignments(admin_profile_id, is_active, resource_type, resource_id);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  capability text,
  resource_type text,
  resource_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  occurred_at timestamptz not null default now(),
  check (length(trim(action)) > 0),
  check (length(trim(entity_type)) > 0)
);

create index if not exists admin_audit_log_occurred_idx
  on public.admin_audit_log(occurred_at desc);
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log(actor_admin_profile_id, occurred_at desc);
create index if not exists admin_audit_log_entity_idx
  on public.admin_audit_log(entity_type, entity_id, occurred_at desc);

create or replace function public.normalized_admin_role(p_role text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(coalesce(p_role, ''))), '[^a-z0-9]+', '_', 'g');
$$;

-- Fail transactionally before any restrictive write policy is installed if
-- the live database has no active administrator that the new capability model
-- can recognize. This prevents an authorization lockout on older role labels.
do $$
begin
  if not exists (
    select 1
    from public.admin_profiles profile
    where profile.is_active = true
      and (
        coalesce(profile.is_super_admin, false)
        or public.normalized_admin_role(profile.role) in ('super_admin', 'owner', 'founder')
        or coalesce(cardinality(profile.permissions), 0) > 0
        or exists (
          select 1
          from public.admin_role_presets preset
          where preset.role_key = public.normalized_admin_role(profile.role)
        )
      )
  ) then
    raise exception 'PHASE0_ADMIN_LOCKOUT_GUARD: no active administrator maps to the new capability model'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.has_admin_permission(
  p_capability text,
  p_resource_type text default null,
  p_resource_id text default null,
  p_write boolean default true
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  profile_record record;
  preset_record record;
  normalized_role text;
  capability_allowed boolean := false;
begin
  if auth.uid() is null or nullif(trim(coalesce(p_capability, '')), '') is null then
    return false;
  end if;

  select ap.id, ap.role, ap.is_super_admin, ap.permissions
  into profile_record
  from public.admin_profiles ap
  where ap.user_id = auth.uid()
    and ap.is_active = true
  limit 1;

  if not found then
    return false;
  end if;

  normalized_role := public.normalized_admin_role(profile_record.role);

  if coalesce(profile_record.is_super_admin, false)
     or normalized_role in ('super_admin', 'owner', 'founder') then
    return true;
  end if;

  select rp.permissions, rp.read_only, rp.requires_scope
  into preset_record
  from public.admin_role_presets rp
  where rp.role_key = normalized_role;

  capability_allowed :=
    p_capability = any(coalesce(profile_record.permissions, '{}'::text[]))
    or (
      preset_record.permissions is not null
      and p_capability = any(preset_record.permissions)
    );

  if not capability_allowed then
    return false;
  end if;

  if p_write and coalesce(preset_record.read_only, false) then
    return false;
  end if;

  if coalesce(preset_record.requires_scope, false) then
    if nullif(trim(coalesce(p_resource_type, '')), '') is null
       or nullif(trim(coalesce(p_resource_id, '')), '') is null then
      return false;
    end if;

    return exists (
      select 1
      from public.admin_assignments assignment
      where assignment.admin_profile_id = profile_record.id
        and assignment.is_active = true
        and assignment.resource_type = p_resource_type
        and assignment.resource_id = p_resource_id
        and (assignment.starts_at is null or assignment.starts_at <= now())
        and (assignment.ends_at is null or assignment.ends_at > now())
        and (
          cardinality(assignment.permissions) = 0
          or p_capability = any(assignment.permissions)
        )
    );
  end if;

  return true;
end;
$$;

create or replace function public.has_admin_any_permission(
  p_capabilities text[],
  p_resource_type text default null,
  p_resource_id text default null,
  p_write boolean default true
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from unnest(coalesce(p_capabilities, '{}'::text[])) capability
    where public.has_admin_permission(capability, p_resource_type, p_resource_id, p_write)
  );
$$;

create or replace function public.record_admin_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_capability text default null,
  p_resource_type text default null,
  p_resource_id text default null,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_metadata jsonb default '{}'::jsonb,
  p_request_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_id uuid;
  audit_id uuid;
begin
  select ap.id into profile_id
  from public.admin_profiles ap
  where ap.user_id = auth.uid() and ap.is_active = true
  limit 1;

  if profile_id is null then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  if p_capability is not null
     and not public.has_admin_permission(p_capability, p_resource_type, p_resource_id, true) then
    raise exception 'ADMIN_PERMISSION_REQUIRED' using errcode = '42501';
  end if;

  insert into public.admin_audit_log (
    actor_user_id, actor_admin_profile_id, action, entity_type, entity_id,
    capability, resource_type, resource_id, before_data, after_data,
    metadata, request_id
  ) values (
    auth.uid(), profile_id, trim(p_action), trim(p_entity_type), p_entity_id,
    p_capability, p_resource_type, p_resource_id, p_before_data, p_after_data,
    coalesce(p_metadata, '{}'::jsonb), p_request_id
  ) returning id into audit_id;

  return audit_id;
end;
$$;

create or replace function public.capture_admin_row_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_profile_id uuid;
  old_data jsonb;
  new_data jsonb;
  entity_key text;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select ap.id into actor_profile_id
  from public.admin_profiles ap
  where ap.user_id = auth.uid() and ap.is_active = true
  limit 1;

  if actor_profile_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  old_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  entity_key := coalesce(
    new_data->>'id', old_data->>'id',
    new_data->>'event_id', old_data->>'event_id',
    new_data->>'slug', old_data->>'slug'
  );

  insert into public.admin_audit_log (
    actor_user_id, actor_admin_profile_id, action, entity_type, entity_id,
    capability, before_data, after_data, metadata
  ) values (
    auth.uid(), actor_profile_id, lower(tg_op), tg_argv[0], entity_key,
    nullif(tg_argv[1], ''), old_data, new_data,
    jsonb_build_object('table', tg_table_schema || '.' || tg_table_name, 'source', 'database_trigger')
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

alter table public.admin_role_presets enable row level security;
alter table public.admin_assignments enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists "Admins read role presets" on public.admin_role_presets;
create policy "Admins read role presets"
  on public.admin_role_presets for select to authenticated
  using (public.has_admin_any_permission(array['admin_users','activity'], null, null, false));

drop policy if exists "Directors manage role presets" on public.admin_role_presets;
create policy "Directors manage role presets"
  on public.admin_role_presets for all to authenticated
  using (public.has_admin_permission('admin_users'))
  with check (public.has_admin_permission('admin_users'));

drop policy if exists "Admins read permitted assignments" on public.admin_assignments;
create policy "Admins read permitted assignments"
  on public.admin_assignments for select to authenticated
  using (
    admin_profile_id = (select ap.id from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true limit 1)
    or public.has_admin_permission('admin_users', null, null, false)
  );

drop policy if exists "Directors manage assignments" on public.admin_assignments;
create policy "Directors manage assignments"
  on public.admin_assignments for all to authenticated
  using (public.has_admin_permission('admin_users'))
  with check (public.has_admin_permission('admin_users'));

drop policy if exists "Authorized admins read audit log" on public.admin_audit_log;
create policy "Authorized admins read audit log"
  on public.admin_audit_log for select to authenticated
  using (public.has_admin_any_permission(array['audit','activity'], null, null, false));

grant select on public.admin_role_presets to authenticated;
grant select, insert, update, delete on public.admin_assignments to authenticated;
grant select on public.admin_audit_log to authenticated;
grant execute on function public.has_admin_permission(text, text, text, boolean) to authenticated;
grant execute on function public.has_admin_any_permission(text[], text, text, boolean) to authenticated;
grant execute on function public.record_admin_audit_event(text, text, text, text, text, text, jsonb, jsonb, jsonb, text) to authenticated;

-- Restrictive policies strengthen existing permissive Admin policies without
-- deleting them. This preserves the previous release's reads while ensuring
-- authenticated writes also satisfy the central capability check.
do $$
declare
  policy_target record;
  table_reference regclass;
begin
  for policy_target in
    select * from (values
      ('players', 'players'),
      ('games', 'games'),
      ('game_rosters', 'rosters'),
      ('player_game_stats', 'stats'),
      ('guest_hoopers', 'guest_hoopers'),
      ('game_guest_rosters', 'game_guests'),
      ('guest_game_stats', 'guest_game_stats'),
      ('guest_one_on_one_stats', 'one_on_one'),
      ('event_case_studies', 'calendar'),
      ('event_records', 'calendar'),
      ('team_profiles', 'teams'),
      ('team_roster_members', 'teams'),
      ('team_games', 'teams'),
      ('team_training_sessions', 'teams'),
      ('team_media', 'teams'),
      ('team_event_links', 'teams'),
      ('team_profile_claims', 'teams'),
      ('media_stories', 'media_stories'),
      ('game_media', 'games'),
      ('player_media', 'players'),
      ('player_achievements', 'players')
    ) as targets(table_name, capability)
  loop
    table_reference := to_regclass(format('public.%I', policy_target.table_name));
    if table_reference is null then
      continue;
    end if;

    execute format('alter table %s enable row level security', table_reference);
    execute format('drop policy if exists "phase0 capability insert guard" on %s', table_reference);
    execute format('drop policy if exists "phase0 capability update guard" on %s', table_reference);
    execute format('drop policy if exists "phase0 capability delete guard" on %s', table_reference);

    execute format(
      'create policy "phase0 capability insert guard" on %s as restrictive for insert to authenticated with check (public.has_admin_permission(%L))',
      table_reference,
      policy_target.capability
    );
    execute format(
      'create policy "phase0 capability update guard" on %s as restrictive for update to authenticated using (public.has_admin_permission(%L)) with check (public.has_admin_permission(%L))',
      table_reference,
      policy_target.capability,
      policy_target.capability
    );
    execute format(
      'create policy "phase0 capability delete guard" on %s as restrictive for delete to authenticated using (public.has_admin_permission(%L))',
      table_reference,
      policy_target.capability
    );

    execute format('drop trigger if exists phase0_admin_audit_trigger on %s', table_reference);
    execute format(
      'create trigger phase0_admin_audit_trigger after insert or update or delete on %s for each row execute function public.capture_admin_row_audit(%L, %L)',
      table_reference,
      policy_target.table_name,
      policy_target.capability
    );
  end loop;
end;
$$;

comment on table public.admin_assignments is
  'Resource scopes for operational roles. Scoped roles receive no global write access.';
comment on table public.admin_audit_log is
  'Immutable audit evidence for important authenticated Admin changes.';

commit;
