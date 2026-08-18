-- FACKTS Hoops
-- Canonical per-game basketball box score foundation.
--
-- PURPOSE
-- 1. A public game may contain statistics for BOTH teams.
-- 2. A player does NOT need a permanent FACKTS player profile to appear
--    in a verified game box score.
-- 3. Registered-team roster players retain roster identity.
-- 4. Unregistered opponents may exist only inside the specific game.
-- 5. Permanent player_id remains optional and powers richer FACKTS profiles.
-- 6. Game league/season/division/report metadata remains attached to the game.

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- GAME CONTEXT
-- ============================================================

alter table public.games
  add column if not exists league_id uuid
    references public.leagues(id) on delete set null,

  add column if not exists season_label text,

  add column if not exists division text,

  add column if not exists competition_name text,

  add column if not exists venue text,

  add column if not exists officials text,

  add column if not exists table_officials text,

  add column if not exists report_metadata jsonb
    not null default '{}'::jsonb;


create index if not exists games_league_season_division_idx
  on public.games(
    league_id,
    season_label,
    division,
    game_date desc
  );


-- ============================================================
-- CANONICAL GAME BOX SCORE
-- ============================================================

create table if not exists public.game_box_score_lines (

  id uuid primary key default gen_random_uuid(),

  -- The canonical game this statistic belongs to.
  game_id uuid not null
    references public.games(id)
    on delete cascade,

  -- home / away is a GAME concept, independent of whether
  -- the team is registered with FACKTS.
  team_side text not null
    check (team_side in ('home', 'away')),

  -- Snapshot name ensures the historical box score survives
  -- even when an opponent does not exist in team_profiles.
  team_name text not null,

  -- Registered FACKTS team when available.
  -- Null is valid for an unregistered opponent.
  team_id uuid
    references public.team_profiles(id)
    on delete set null,

  -- Registered roster identity when available.
  -- Null is valid for an unregistered opponent.
  roster_member_id uuid
    references public.team_roster_members(id)
    on delete set null,

  -- Permanent FACKTS player identity.
  -- This is OPTIONAL.
  player_id uuid
    references public.players(id)
    on delete set null,

  -- Describes how strongly this person is linked into FACKTS.
  identity_type text not null default 'game_only'
    check (
      identity_type in (
        'canonical_player',
        'team_roster',
        'game_only',
        'guest'
      )
    ),

  -- Historical snapshot identity.
  display_name text not null,

  jersey_number text,

  position text,

  is_starter boolean not null default false,

  -- ==========================================================
  -- PLAYING TIME
  -- ==========================================================

  minutes numeric not null default 0
    check (minutes >= 0),

  -- ==========================================================
  -- SCORING
  -- ==========================================================

  points integer not null default 0
    check (points >= 0),

  field_goals_made integer not null default 0
    check (field_goals_made >= 0),

  field_goals_attempted integer not null default 0
    check (field_goals_attempted >= 0),

  two_made integer not null default 0
    check (two_made >= 0),

  two_attempted integer not null default 0
    check (two_attempted >= 0),

  three_made integer not null default 0
    check (three_made >= 0),

  three_attempted integer not null default 0
    check (three_attempted >= 0),

  ft_made integer not null default 0
    check (ft_made >= 0),

  ft_attempted integer not null default 0
    check (ft_attempted >= 0),

  -- ==========================================================
  -- REBOUNDS / PLAYMAKING / DEFENCE
  -- ==========================================================

  offensive_rebounds integer not null default 0
    check (offensive_rebounds >= 0),

  defensive_rebounds integer not null default 0
    check (defensive_rebounds >= 0),

  rebounds integer not null default 0
    check (rebounds >= 0),

  assists integer not null default 0
    check (assists >= 0),

  turnovers integer not null default 0
    check (turnovers >= 0),

  steals integer not null default 0
    check (steals >= 0),

  blocks integer not null default 0
    check (blocks >= 0),

  fouls integer not null default 0
    check (fouls >= 0),

  fouls_drawn integer not null default 0
    check (fouls_drawn >= 0),

  -- ==========================================================
  -- ADVANCED / REPORT VALUES
  -- ==========================================================

  plus_minus integer not null default 0,

  efficiency numeric,

  pir numeric,

  player_of_game boolean not null default false,

  period_values jsonb
    not null default '{}'::jsonb,

  extra_stats jsonb
    not null default '{}'::jsonb,

  -- Flexible stable identity supplied by the importer.
  --
  -- Examples:
  -- team:<team-id>:roster:<roster-id>
  -- away:jersey:11:erick-mutiso
  --
  -- This lets imports be updated without blindly creating
  -- duplicate player rows.
  source_line_key text,

  -- ==========================================================
  -- SOURCE TRACEABILITY
  -- ==========================================================

  source_type text not null default 'admin_manual'
    check (
      source_type in (
        'team_import',
        'admin_manual',
        'live_capture',
        'external_report',
        'legacy'
      )
    ),

  source_import_id uuid
    references public.team_stat_imports(id)
    on delete set null,

  source_session_id uuid
    references public.team_stat_sessions(id)
    on delete set null,

  source_submission_id uuid
    references public.team_stat_submissions(id)
    on delete set null,

  -- ==========================================================
  -- GOVERNANCE
  -- ==========================================================

  verification_status text not null default 'unverified'
    check (
      verification_status in (
        'unverified',
        'pending',
        'verified',
        'disputed'
      )
    ),

  is_public boolean not null default false,

  verified_at timestamptz,

  verified_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  -- Basketball arithmetic safety.
  check (field_goals_made <= field_goals_attempted),

  check (two_made <= two_attempted),

  check (three_made <= three_attempted),

  check (ft_made <= ft_attempted)

);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists game_box_score_game_idx
  on public.game_box_score_lines(
    game_id,
    team_side
  );


create index if not exists game_box_score_team_idx
  on public.game_box_score_lines(
    team_id,
    game_id
  )
  where team_id is not null;


create index if not exists game_box_score_player_idx
  on public.game_box_score_lines(
    player_id,
    game_id
  )
  where player_id is not null;


create index if not exists game_box_score_roster_idx
  on public.game_box_score_lines(
    roster_member_id,
    game_id
  )
  where roster_member_id is not null;


create index if not exists game_box_score_public_idx
  on public.game_box_score_lines(
    game_id,
    verification_status,
    is_public
  );


create unique index if not exists game_box_score_source_key_unique
  on public.game_box_score_lines(
    game_id,
    source_line_key
  )
  where source_line_key is not null;


-- ============================================================
-- SECURITY
-- ============================================================

alter table public.game_box_score_lines
  enable row level security;


drop policy if exists
  "Public verified game box scores are readable"
  on public.game_box_score_lines;


create policy
  "Public verified game box scores are readable"
  on public.game_box_score_lines
  for select
  using (
    is_public = true

    and verification_status = 'verified'

    and exists (
      select 1
      from public.games game
      where game.id = game_id
        and game.is_public = true
    )
  );


grant select
  on public.game_box_score_lines
  to anon, authenticated;


-- ============================================================
-- BACKFILL ALREADY-APPROVED CLUB STAT SESSIONS
--
-- This is intentionally conservative.
-- Only sessions that have already been approved are copied.
-- Pending/rejected drafts are NOT published.
-- ============================================================

insert into public.game_box_score_lines (

  game_id,

  team_side,

  team_name,

  team_id,

  roster_member_id,

  player_id,

  identity_type,

  display_name,

  jersey_number,

  minutes,

  points,

  field_goals_made,

  field_goals_attempted,

  two_made,

  two_attempted,

  three_made,

  three_attempted,

  ft_made,

  ft_attempted,

  offensive_rebounds,

  defensive_rebounds,

  rebounds,

  assists,

  turnovers,

  steals,

  blocks,

  fouls,

  plus_minus,

  period_values,

  source_line_key,

  source_type,

  source_import_id,

  source_session_id,

  source_submission_id,

  verification_status,

  is_public,

  verified_at,

  created_at,

  updated_at

)

select

  game.id,

  case
    when game.home_team_id = session.team_id
      then 'home'
    else 'away'
  end,

  case
    when game.home_team_id = session.team_id
      then coalesce(
        game.home_team_name,
        team.name,
        'Home team'
      )
    else coalesce(
      game.away_team_name,
      team.name,
      'Away team'
    )
  end,

  session.team_id,

  line.roster_member_id,

  line.player_id,

  case
    when line.player_id is not null
      then 'canonical_player'
    else 'team_roster'
  end,

  line.display_name,

  roster.jersey_number,

  coalesce(line.minutes, 0),

  coalesce(line.points, 0),

  coalesce(line.two_made, 0)
    + coalesce(line.three_made, 0),

  coalesce(line.two_attempted, 0)
    + coalesce(line.three_attempted, 0),

  coalesce(line.two_made, 0),

  coalesce(line.two_attempted, 0),

  coalesce(line.three_made, 0),

  coalesce(line.three_attempted, 0),

  coalesce(line.ft_made, 0),

  coalesce(line.ft_attempted, 0),

  coalesce(line.offensive_rebounds, 0),

  coalesce(line.defensive_rebounds, 0),

  coalesce(line.rebounds, 0),

  coalesce(line.assists, 0),

  coalesce(line.turnovers, 0),

  coalesce(line.steals, 0),

  coalesce(line.blocks, 0),

  coalesce(line.fouls, 0),

  coalesce(line.plus_minus, 0),

  coalesce(
    line.period_values,
    '{}'::jsonb
  ),

  'team:'
    || session.team_id::text
    || ':roster:'
    || line.roster_member_id::text,

  'team_import',

  session.source_import_id,

  session.id,

  session.source_submission_id,

  'verified',

  true,

  coalesce(
    session.reviewed_at,
    now()
  ),

  coalesce(
    line.created_at,
    now()
  ),

  now()

from public.team_stat_sessions session

join public.team_player_stat_lines line
  on line.session_id = session.id

join public.games game
  on game.id::text = session.game_id::text

join public.team_profiles team
  on team.id = session.team_id

left join public.team_roster_members roster
  on roster.id = line.roster_member_id

where session.status = 'approved'

  and line.status = 'approved'

  and (
    game.home_team_id = session.team_id
    or game.away_team_id = session.team_id
  )

on conflict do nothing;


comment on table public.game_box_score_lines is
  'Canonical verified per-game basketball box score. Supports permanent players, registered roster-only players and game-only opponents without requiring every participant to own a full FACKTS player profile.';


comment on column public.game_box_score_lines.player_id is
  'Optional permanent FACKTS identity. Null does not prevent a verified game stat line.';


comment on column public.game_box_score_lines.roster_member_id is
  'Optional registered-team roster identity. Used for lightweight club/player statistics when no permanent player profile exists.';


comment on column public.game_box_score_lines.identity_type is
  'canonical_player = permanent FACKTS profile; team_roster = registered roster-only identity; game_only = participant exists only in this game; guest = legacy guest identity.';


commit;