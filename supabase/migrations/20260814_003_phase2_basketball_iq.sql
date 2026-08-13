-- FACKTS Hoops Phase 2 Basketball IQ
-- Club stat capture is operational immediately inside the team workspace.
-- Public/canonical statistics remain governed by the existing Super Admin queue.

begin;

create extension if not exists pgcrypto;

create table if not exists public.team_stat_imports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  game_id text,
  uploaded_by_user_id uuid not null references auth.users(id) on delete restrict,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint not null default 0 check (file_size >= 0),
  extraction_status text not null default 'review_required'
    check (extraction_status in ('parsed','partial','review_required','failed')),
  extracted_rows jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_stat_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  game_id text not null check (length(trim(game_id)) > 0),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  mode text not null default 'live' check (mode in ('live','box_score','import')),
  status text not null default 'draft'
    check (status in ('draft','submitted','approved','rejected','archived')),
  current_period text not null default 'Q1'
    check (current_period ~ '^(Q[1-4]|OT[1-9]?)$'),
  source_import_id uuid references public.team_stat_imports(id) on delete set null,
  source_submission_id uuid references public.team_stat_submissions(id) on delete set null,
  notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_player_stat_lines (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.team_stat_sessions(id) on delete cascade,
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  game_id text not null check (length(trim(game_id)) > 0),
  roster_member_id uuid not null references public.team_roster_members(id) on delete restrict,
  player_id uuid references public.players(id) on delete set null,
  display_name text not null,
  points integer not null default 0 check (points >= 0),
  rebounds integer not null default 0 check (rebounds >= 0),
  offensive_rebounds integer not null default 0 check (offensive_rebounds >= 0),
  defensive_rebounds integer not null default 0 check (defensive_rebounds >= 0),
  assists integer not null default 0 check (assists >= 0),
  steals integer not null default 0 check (steals >= 0),
  blocks integer not null default 0 check (blocks >= 0),
  turnovers integer not null default 0 check (turnovers >= 0),
  fouls integer not null default 0 check (fouls >= 0),
  minutes numeric not null default 0 check (minutes >= 0),
  two_made integer not null default 0 check (two_made >= 0),
  two_attempted integer not null default 0 check (two_attempted >= 0),
  three_made integer not null default 0 check (three_made >= 0),
  three_attempted integer not null default 0 check (three_attempted >= 0),
  ft_made integer not null default 0 check (ft_made >= 0),
  ft_attempted integer not null default 0 check (ft_attempted >= 0),
  plus_minus integer not null default 0,
  period_values jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','submitted','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, roster_member_id),
  check (two_made <= two_attempted),
  check (three_made <= three_attempted),
  check (ft_made <= ft_attempted)
);

create table if not exists public.team_performance_briefings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  roster_member_id uuid references public.team_roster_members(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  audience text not null default 'team' check (audience in ('team','player')),
  title text not null check (length(trim(title)) > 0),
  focus_area text,
  body text not null check (length(trim(body)) > 0),
  source_type text not null default 'coach' check (source_type in ('coach','data_led')),
  linked_session_id uuid references public.team_stat_sessions(id) on delete set null,
  status text not null default 'published' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    audience = 'team'
    or roster_member_id is not null
    or player_id is not null
  )
);

create index if not exists team_stat_imports_team_created_idx
  on public.team_stat_imports(team_id, created_at desc);
create index if not exists team_stat_sessions_team_game_idx
  on public.team_stat_sessions(team_id, game_id, updated_at desc);
create index if not exists team_stat_sessions_review_idx
  on public.team_stat_sessions(status, submitted_at desc);
create index if not exists team_player_stat_lines_team_player_idx
  on public.team_player_stat_lines(team_id, player_id, updated_at desc);
create index if not exists team_player_stat_lines_session_idx
  on public.team_player_stat_lines(session_id, roster_member_id);
create index if not exists team_briefings_team_status_idx
  on public.team_performance_briefings(team_id, status, published_at desc);
create index if not exists team_briefings_player_status_idx
  on public.team_performance_briefings(player_id, status, published_at desc);

alter table public.team_stat_imports enable row level security;
alter table public.team_stat_sessions enable row level security;
alter table public.team_player_stat_lines enable row level security;
alter table public.team_performance_briefings enable row level security;

-- Reads and writes are intentionally routed through authenticated server APIs.
-- Service-role access powers club workspaces and the player portal; no public
-- policy can expose draft performance or private coach notes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-stat-imports',
  'team-stat-imports',
  false,
  15728640,
  array[
    'text/csv','text/plain','text/tab-separated-values',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

comment on table public.team_stat_sessions is
  'Autosaved club game-stat sessions. Draft and submitted rows drive private Basketball IQ; only Super Admin approval may canonicalize linked official players.';
comment on table public.team_performance_briefings is
  'Coach and data-led development briefings delivered to a whole club or a linked official player login.';

-- Basketball records end in a win or loss. An equal score is incomplete until
-- overtime produces a winner.
update public.team_games set result = null, updated_at = now()
where result is not null and result not in ('W','L');
alter table public.team_games drop constraint if exists team_games_result_check;
alter table public.team_games add constraint team_games_result_check
  check (result is null or result in ('W','L'));

commit;
