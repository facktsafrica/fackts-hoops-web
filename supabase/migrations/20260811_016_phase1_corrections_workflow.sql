-- FACKTS Hoops Admin Rebuild - Phase 1 / M16
-- Adds reviewer evidence and a transactional, whitelisted correction apply path.

begin;

alter table public.correction_requests
  add column if not exists requested_by_admin_profile_id uuid references public.admin_profiles(id) on delete set null,
  add column if not exists reviewed_by uuid references public.admin_profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists applied_at timestamptz;

create or replace function public.phase1_apply_correction(
  p_request_id uuid,
  p_reviewer_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_record public.correction_requests%rowtype;
  change_record public.correction_changes%rowtype;
  target_table text;
  target_id_column text := 'id';
  target_type text;
  current_value jsonb;
  affected integer;
  applied_count integer := 0;
  stat_game_id text;
begin
  select * into request_record
  from public.correction_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'CORRECTION_REQUEST_NOT_FOUND';
  end if;

  if request_record.correction_status = 'resolved' then
    return jsonb_build_object(
      'request_id', p_request_id,
      'applied', true,
      'idempotent', true
    );
  end if;

  if request_record.correction_status <> 'in_progress' then
    raise exception 'CORRECTION_MUST_BE_APPROVED_BEFORE_APPLY';
  end if;

  if not exists (
    select 1 from public.correction_changes
    where correction_request_id = p_request_id
      and change_status = 'accepted'
  ) then
    raise exception 'CORRECTION_HAS_NO_ACCEPTED_CHANGES';
  end if;

  target_table := case request_record.entity_type
    when 'stat' then 'player_game_stats'
    when 'game' then 'games'
    when 'player' then 'players'
    when 'event' then 'event_case_studies'
    when 'team' then 'team_profiles'
    when 'media' then 'media_assets'
    else null
  end;

  if target_table is null then
    raise exception 'CORRECTION_ENTITY_NOT_APPLICABLE';
  end if;
  if request_record.entity_type = 'event' then
    target_id_column := 'event_id';
  end if;

  for change_record in
    select * from public.correction_changes
    where correction_request_id = p_request_id
      and change_status = 'accepted'
    order by created_at, id
    for update
  loop
    target_type := case
      when request_record.entity_type = 'stat'
       and change_record.field_path in (
         'points','rebounds','offensive_rebounds','defensive_rebounds','assists',
         'steals','blocks','turnovers','fouls','two_made','two_attempted',
         'three_made','three_attempted','ft_made','ft_attempted',
         'three_pointers_made','q1','q2','q3','q4','plus_minus'
       ) then 'integer'
      when request_record.entity_type = 'stat'
       and change_record.field_path = 'minutes' then 'numeric'
      when request_record.entity_type = 'stat'
       and change_record.field_path = 'player_of_game' then 'boolean'
      when request_record.entity_type = 'game'
       and change_record.field_path in ('home_score','team_score','fackts_score','away_score','opponent_score') then 'integer'
      when request_record.entity_type = 'game'
       and change_record.field_path = 'game_date' then 'timestamptz'
      when request_record.entity_type = 'game'
       and change_record.field_path in ('status','home_team_name','away_team_name','venue','court','game_stage') then 'text'
      when request_record.entity_type = 'player'
       and change_record.field_path in ('full_name','name','nickname','jersey_number','position','current_team','player_type') then 'text'
      when request_record.entity_type = 'player'
       and change_record.field_path in ('is_active','is_featured') then 'boolean'
      when request_record.entity_type = 'event'
       and change_record.field_path in ('title','summary','venue','location','event_type','age_category','organizer_name','status') then 'text'
      when request_record.entity_type = 'event'
       and change_record.field_path in ('start_date','end_date') then 'date'
      when request_record.entity_type = 'team'
       and change_record.field_path in ('name','short_name','description','city','division','age_category','coach_name') then 'text'
      when request_record.entity_type = 'media'
       and change_record.field_path in ('title','rights_status','publish_status') then 'text'
      when request_record.entity_type = 'media'
       and change_record.field_path = 'is_public' then 'boolean'
      else null
    end;

    if target_type is null then
      raise exception 'CORRECTION_FIELD_NOT_ALLOWED: %', change_record.field_path;
    end if;

    execute format(
      'select to_jsonb(target)->%L from public.%I target where target.%I::text = $1',
      change_record.field_path,
      target_table,
      target_id_column
    ) into current_value using request_record.entity_id;

    if current_value is distinct from change_record.previous_value then
      raise exception 'CORRECTION_TARGET_CHANGED_SINCE_REQUEST';
    end if;

    execute format(
      'update public.%I set %I = ($1 #>> ''{}'')::%s, updated_at = now() where %I::text = $2',
      target_table,
      change_record.field_path,
      target_type,
      target_id_column
    ) using change_record.proposed_value, request_record.entity_id;

    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'CORRECTION_TARGET_NOT_FOUND';
    end if;

    if request_record.entity_type = 'game'
       and change_record.field_path in ('home_score','team_score','fackts_score') then
      execute 'update public.games set home_score = ($1 #>> ''{}'')::integer, team_score = ($1 #>> ''{}'')::integer, fackts_score = ($1 #>> ''{}'')::integer where id::text = $2'
      using change_record.proposed_value, request_record.entity_id;
    elsif request_record.entity_type = 'game'
       and change_record.field_path in ('away_score','opponent_score') then
      execute 'update public.games set away_score = ($1 #>> ''{}'')::integer, opponent_score = ($1 #>> ''{}'')::integer where id::text = $2'
      using change_record.proposed_value, request_record.entity_id;
    end if;

    update public.correction_changes
    set change_status = 'applied',
        applied_by = p_reviewer_profile_id,
        applied_at = now(),
        updated_at = now()
    where id = change_record.id;

    applied_count := applied_count + 1;
  end loop;

  if request_record.entity_type = 'stat' then
    select game_id::text into stat_game_id
    from public.player_game_stats
    where id::text = request_record.entity_id;

    update public.player_game_stats
    set entry_status = 'disputed',
        verification_status = 'disputed',
        verification_note = 'Applied correction ' || p_request_id::text,
        verified_at = null,
        verified_by = null,
        updated_at = now()
    where id::text = request_record.entity_id;

    update public.games
    set verification_status = 'disputed',
        correction_status = 'corrected',
        correction_note = 'Statistics correction ' || p_request_id::text || ' applied; re-verification required.',
        updated_at = now()
    where id::text = stat_game_id;
  elsif request_record.entity_type = 'game' then
    update public.games
    set correction_status = 'corrected',
        correction_note = request_record.summary,
        verification_status = 'disputed',
        updated_at = now()
    where id::text = request_record.entity_id;
  end if;

  update public.correction_requests
  set correction_status = 'resolved',
      resolved_by = p_reviewer_profile_id,
      resolved_at = now(),
      applied_at = now(),
      reviewed_by = coalesce(reviewed_by, p_reviewer_profile_id),
      reviewed_at = coalesce(reviewed_at, now()),
      updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'request_id', p_request_id,
    'applied', true,
    'idempotent', false,
    'applied_changes', applied_count
  );
end;
$$;

revoke all on function public.phase1_apply_correction(uuid, uuid) from public, anon, authenticated;
grant execute on function public.phase1_apply_correction(uuid, uuid) to service_role;

comment on function public.phase1_apply_correction(uuid, uuid) is
  'Transactional correction application with a strict entity/field whitelist and stale-value protection.';

commit;
