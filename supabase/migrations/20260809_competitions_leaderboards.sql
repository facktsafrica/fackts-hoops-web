begin;

create extension if not exists pgcrypto;

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  summary text,
  description text,
  competition_format text not null default 'Basketball',
  organizer_name text,
  current_season_label text,
  status text not null default 'upcoming',
  start_date date,
  end_date date,
  venue text,
  location text,
  logo_url text,
  cover_image_url text,
  rules_summary text,
  target_games integer,
  standings_method text not null default 'wins, win rate, point difference, points scored',
  verification_status text not null default 'unverified',
  is_public boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guest_one_on_one_stats
  add column if not exists competition_slug text not null default 'fackts-kings',
  add column if not exists season_label text not null default '2026',
  add column if not exists verification_status text not null default 'pending',
  add column if not exists is_public boolean not null default true,
  add column if not exists published_at timestamptz;

insert into public.competitions (
  slug,
  name,
  short_name,
  summary,
  description,
  competition_format,
  organizer_name,
  current_season_label,
  status,
  start_date,
  venue,
  location,
  cover_image_url,
  logo_url,
  rules_summary,
  target_games,
  verification_status,
  is_public,
  is_featured
)
values (
  'fackts-kings',
  'FACKTS Kings',
  'FACKTS Kings',
  'The ongoing FACKTS one-on-one competition, documented matchup by matchup with verified results, season standings, player records and playable media.',
  'FACKTS Kings is the flagship FACKTS Hoops one-on-one competition. Every fixture, score, participant, standing and media record remains connected to the correct season.',
  '1v1',
  'FACKTS Africa',
  '2026',
  'live',
  '2026-01-01',
  'Multiple courts',
  'Kenya',
  '/images/one-on-one-bg.png',
  '/fackts-hoops-logo.png',
  'Standings rank players by wins, then win rate, point difference, points scored and games played.',
  20,
  'verified',
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  summary = excluded.summary,
  competition_format = excluded.competition_format,
  organizer_name = excluded.organizer_name,
  current_season_label = excluded.current_season_label,
  status = excluded.status,
  verification_status = excluded.verification_status,
  is_public = true,
  is_featured = true,
  updated_at = now();

update public.guest_one_on_one_stats
set
  competition_slug = coalesce(nullif(trim(competition_slug), ''), 'fackts-kings'),
  season_label = coalesce(nullif(trim(season_label), ''), '2026'),
  verification_status = case
    when lower(coalesce(status, '')) = 'completed'
      and points_scored is not null
      and points_allowed is not null
      then 'verified'
    when lower(coalesce(status, '')) in ('upcoming', 'scheduled', 'pending')
      then 'scheduled'
    else coalesce(nullif(trim(verification_status), ''), 'pending')
  end,
  published_at = case
    when lower(coalesce(status, '')) = 'completed' then coalesce(published_at, now())
    else published_at
  end;

create index if not exists competitions_public_status_idx
  on public.competitions(is_public, status, is_featured, created_at desc);

create index if not exists one_on_one_competition_season_idx
  on public.guest_one_on_one_stats(competition_slug, season_label, status, match_date desc);

alter table public.competitions enable row level security;

drop policy if exists "Public competitions are readable" on public.competitions;
create policy "Public competitions are readable"
  on public.competitions for select
  using (is_public = true);

drop policy if exists "Approved admins manage competitions" on public.competitions;
create policy "Approved admins manage competitions"
  on public.competitions for all to authenticated
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

comment on table public.competitions is
  'Permanent series and league profiles. One-off tournaments remain Event Hubs.';

comment on column public.guest_one_on_one_stats.season_label is
  'Required season boundary so standings never mix different seasons.';

comment on column public.guest_one_on_one_stats.verification_status is
  'Evidence state for a published matchup: scheduled, pending, verified or disputed.';

commit;
