begin;

create extension if not exists pgcrypto;

alter table public.games
  add column if not exists match_type text,
  add column if not exists home_team_name text,
  add column if not exists away_team_name text,
  add column if not exists competition_name text,
  add column if not exists event_id text,
  add column if not exists game_format text,
  add column if not exists game_stage text,
  add column if not exists court text,
  add column if not exists period_scores jsonb not null default '[]'::jsonb,
  add column if not exists officials text,
  add column if not exists table_officials text,
  add column if not exists home_roster text,
  add column if not exists away_roster text,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by text,
  add column if not exists correction_status text not null default 'none',
  add column if not exists correction_note text,
  add column if not exists is_public boolean not null default true;

alter table public.player_game_stats
  add column if not exists team_side text not null default 'home';

alter table public.guest_game_stats
  add column if not exists team_side text not null default 'home';

update public.games
set
  home_team_name = coalesce(nullif(trim(home_team_name), ''), 'FACKTS'),
  away_team_name = coalesce(
    nullif(trim(away_team_name), ''),
    nullif(trim(opponent), ''),
    nullif(trim(opponent_name), ''),
    nullif(trim(team_name), ''),
    'Opponent'
  ),
  competition_name = coalesce(nullif(trim(competition_name), ''), nullif(trim(match_type), ''), 'FACKTS Hoops'),
  game_format = coalesce(nullif(trim(game_format), ''), nullif(trim(match_type), ''), 'Basketball'),
  game_stage = coalesce(nullif(trim(game_stage), ''), 'Game'),
  verification_status = case
    when verification_status is null or trim(verification_status) = '' then 'unverified'
    else verification_status
  end;

create table if not exists public.game_media (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  title text not null,
  media_type text not null default 'video',
  url text not null,
  thumbnail_url text,
  platform text,
  rights_status text not null default 'approved',
  publish_status text not null default 'published',
  is_public boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_public_status_date_idx
  on public.games(is_public, status, game_date desc);

create index if not exists games_event_date_idx
  on public.games(event_id, game_date desc);

create index if not exists game_media_game_order_idx
  on public.game_media(game_id, display_order, created_at);

alter table public.game_media enable row level security;

drop policy if exists "Public game media is readable" on public.game_media;
create policy "Public game media is readable"
  on public.game_media for select
  using (is_public = true and publish_status = 'published');

drop policy if exists "Approved admins manage game media" on public.game_media;
create policy "Approved admins manage game media"
  on public.game_media for all to authenticated
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.user_id = auth.uid() and ap.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_profiles ap
      where ap.user_id = auth.uid() and ap.is_active = true
    )
  );

comment on table public.game_media is
  'Rights-aware video and photo records attached to a specific FACKTS Hoops match centre.';

comment on column public.games.event_id is
  'Optional link to event_case_studies.event_id. Standalone games remain valid without an event.';

comment on column public.games.verification_status is
  'Public evidence state: unverified, pending, verified or disputed.';

commit;
