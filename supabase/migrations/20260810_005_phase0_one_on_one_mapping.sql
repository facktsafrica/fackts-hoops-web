-- FACKTS Hoops Admin Rebuild - Phase 0 / M05
-- Maps evidence-backed 1v1 records into the existing canonical games,
-- game_rosters and player_game_stats tables. Public 1v1 reads are not switched.

begin;

alter table public.games
  add column if not exists legacy_one_on_one_id text;

create unique index if not exists games_legacy_one_on_one_id_unique
  on public.games(legacy_one_on_one_id)
  where legacy_one_on_one_id is not null;

-- Legacy 1v1 reference columns are text in the live schema. Convert only
-- syntactically valid UUID values; malformed or external references must enter
-- the review queue instead of aborting the migration or being name-matched.
create or replace function public.phase0_try_uuid(p_value text)
returns uuid
language sql
immutable
parallel safe
returns null on null input
as $$
  select case
    when trim(p_value) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then trim(p_value)::uuid
    else null
  end;
$$;

do $$
declare
  legacy record;
  participant_player_id uuid;
  opponent_player_id uuid;
  participant_name text;
  opponent_name text;
  canonical_game_id public.games.id%type;
  participant_roster_id public.game_rosters.id%type;
  opponent_roster_id public.game_rosters.id%type;
  participant_stat_id public.player_game_stats.id%type;
  opponent_stat_id public.player_game_stats.id%type;
begin
  for legacy in
    select * from public.guest_one_on_one_stats order by created_at nulls last, id
  loop
    if exists (
      select 1 from public.legacy_record_mappings mapping
      where mapping.migration_key = 'M05'
        and mapping.source_table = 'guest_one_on_one_stats'
        and mapping.source_id = legacy.id::text
        and mapping.target_table = 'games'
    ) then
      continue;
    end if;

    participant_player_id := null;
    opponent_player_id := null;
    canonical_game_id := null;
    participant_roster_id := null;
    opponent_roster_id := null;
    participant_stat_id := null;
    opponent_stat_id := null;

    if nullif(trim(legacy.fackts_player_id), '') is not null then
      select p.id into participant_player_id
      from public.players p
      where p.id = public.phase0_try_uuid(legacy.fackts_player_id);
    end if;

    if participant_player_id is null and legacy.guest_hooper_id is not null then
      select g.source_player_id into participant_player_id
      from public.guest_hoopers g where g.id = legacy.guest_hooper_id;
    end if;

    if nullif(trim(legacy.opponent_player_id), '') is not null then
      select p.id into opponent_player_id
      from public.players p
      where p.id = public.phase0_try_uuid(legacy.opponent_player_id);
    end if;

    if opponent_player_id is null and nullif(trim(legacy.opponent_guest_hooper_id), '') is not null then
      select g.source_player_id into opponent_player_id
      from public.guest_hoopers g
      where g.id = public.phase0_try_uuid(legacy.opponent_guest_hooper_id);
    end if;

    if participant_player_id is null or opponent_player_id is null then
      insert into public.migration_review_issues (
        issue_key, issue_type, source_table, source_id, target_table,
        severity, summary, details
      ) values (
        'M05:unmapped_1v1:' || legacy.id::text,
        'unmapped_one_on_one_participant',
        'guest_one_on_one_stats',
        legacy.id::text,
        'games',
        'blocking',
        '1v1 record contains an external or missing participant without an evidence-backed canonical identity. No name-only merge was attempted.',
        jsonb_build_object(
          'participant_type', legacy.participant_type,
          'fackts_player_id', legacy.fackts_player_id,
          'guest_hooper_id', legacy.guest_hooper_id,
          'participant_name', legacy.participant_name,
          'opponent_type', legacy.opponent_type,
          'opponent_player_id', legacy.opponent_player_id,
          'opponent_guest_hooper_id', legacy.opponent_guest_hooper_id,
          'opponent_name', legacy.opponent_name
        )
      )
      on conflict (issue_key) do update
      set details = excluded.details, status = 'open', updated_at = now();
      continue;
    end if;

    if participant_player_id = opponent_player_id then
      insert into public.migration_review_issues (
        issue_key, issue_type, source_table, source_id, target_table,
        severity, summary, details
      ) values (
        'M05:same_1v1_person:' || legacy.id::text,
        'invalid_one_on_one_participants',
        'guest_one_on_one_stats',
        legacy.id::text,
        'games',
        'blocking',
        'Both 1v1 sides resolve to the same canonical person.',
        jsonb_build_object('canonical_player_id', participant_player_id)
      )
      on conflict (issue_key) do update
      set details = excluded.details, status = 'open', updated_at = now();
      continue;
    end if;

    select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.name), ''), nullif(trim(p.nickname), ''), 'Player 1')
    into participant_name
    from public.players p where p.id = participant_player_id;

    select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.name), ''), nullif(trim(p.nickname), ''), 'Player 2')
    into opponent_name
    from public.players p where p.id = opponent_player_id;

    select id into canonical_game_id
    from public.games
    where legacy_one_on_one_id = legacy.id::text;

    if canonical_game_id is null then
      insert into public.games (
        team_name, opponent, game_date, venue, match_type, notes,
        team_score, opponent_score, home_team_name, away_team_name,
        competition_name, game_format, game_stage, court, status,
        is_public, legacy_one_on_one_id
      ) values (
        participant_name,
        opponent_name,
        coalesce(legacy.match_date, legacy.created_at, now()),
        legacy.venue,
        '1v1',
        legacy.notes,
        coalesce(legacy.points_scored, 0),
        coalesce(legacy.points_allowed, 0),
        participant_name,
        opponent_name,
        coalesce(nullif(trim(legacy.match_title), ''), 'FACKTS Kings'),
        '1v1',
        coalesce(nullif(trim(legacy.match_number), ''), 'Match'),
        legacy.court,
        coalesce(nullif(trim(legacy.status), ''), 'completed'),
        true,
        legacy.id::text
      )
      returning id into canonical_game_id;
    end if;

    insert into public.game_rosters (
      game_id, player_id, roster_role, roster_status, participation_role,
      team_side, notes, canonicalized_at
    )
    select
      canonical_game_id, participant_player_id, 'starter', 'confirmed',
      case when legacy.participant_type = 'fackts_player' then 'player' else 'guest' end,
      'home', 'Mapped from legacy 1v1 participant.', now()
    where not exists (
      select 1 from public.game_rosters roster
      where roster.game_id = canonical_game_id and roster.player_id = participant_player_id
    )
    returning id into participant_roster_id;

    if participant_roster_id is null then
      select id into participant_roster_id from public.game_rosters
      where game_id = canonical_game_id and player_id = participant_player_id
      order by created_at nulls last, id limit 1;
    end if;

    insert into public.game_rosters (
      game_id, player_id, roster_role, roster_status, participation_role,
      team_side, notes, canonicalized_at
    )
    select
      canonical_game_id, opponent_player_id, 'starter', 'confirmed',
      case when legacy.opponent_type = 'fackts_player' then 'player' else 'guest' end,
      'away', 'Mapped from legacy 1v1 opponent.', now()
    where not exists (
      select 1 from public.game_rosters roster
      where roster.game_id = canonical_game_id and roster.player_id = opponent_player_id
    )
    returning id into opponent_roster_id;

    if opponent_roster_id is null then
      select id into opponent_roster_id from public.game_rosters
      where game_id = canonical_game_id and player_id = opponent_player_id
      order by created_at nulls last, id limit 1;
    end if;

    insert into public.player_game_stats (
      game_id, player_id, points, team_side, entry_status,
      verification_status, extra_stats, canonicalized_at
    )
    select
      canonical_game_id, participant_player_id, coalesce(legacy.points_scored, 0),
      'home', 'submitted', 'unverified',
      jsonb_build_object('legacy_one_on_one_id', legacy.id, 'legacy_result', legacy.result),
      now()
    where not exists (
      select 1 from public.player_game_stats stat
      where stat.game_id = canonical_game_id and stat.player_id = participant_player_id
    )
    returning id into participant_stat_id;

    if participant_stat_id is null then
      select id into participant_stat_id from public.player_game_stats
      where game_id = canonical_game_id and player_id = participant_player_id
      order by created_at nulls last, id limit 1;
    end if;

    insert into public.player_game_stats (
      game_id, player_id, points, team_side, entry_status,
      verification_status, extra_stats, canonicalized_at
    )
    select
      canonical_game_id, opponent_player_id, coalesce(legacy.points_allowed, 0),
      'away', 'submitted', 'unverified',
      jsonb_build_object('legacy_one_on_one_id', legacy.id, 'legacy_result', legacy.result),
      now()
    where not exists (
      select 1 from public.player_game_stats stat
      where stat.game_id = canonical_game_id and stat.player_id = opponent_player_id
    )
    returning id into opponent_stat_id;

    if opponent_stat_id is null then
      select id into opponent_stat_id from public.player_game_stats
      where game_id = canonical_game_id and player_id = opponent_player_id
      order by created_at nulls last, id limit 1;
    end if;

    insert into public.legacy_record_mappings (
      migration_key, source_table, source_id, target_table, target_id, metadata
    ) values (
      'M05', 'guest_one_on_one_stats', legacy.id::text, 'games', canonical_game_id::text,
      jsonb_build_object(
        'participant_player_id', participant_player_id,
        'opponent_player_id', opponent_player_id,
        'participant_roster_id', participant_roster_id,
        'opponent_roster_id', opponent_roster_id,
        'participant_stat_id', participant_stat_id,
        'opponent_stat_id', opponent_stat_id,
        'public_reads_switched', false
      )
    )
    on conflict (migration_key, source_table, source_id, target_table) do update
    set target_id = excluded.target_id, metadata = excluded.metadata;
  end loop;
end;
$$;

comment on column public.games.legacy_one_on_one_id is
  'Compatibility link to guest_one_on_one_stats. Public FACKTS Kings reads remain legacy until Phase 2 approval.';
comment on table public.guest_one_on_one_stats is
  'Legacy 1v1 source retained without write cutover during Phase 0.';

commit;
