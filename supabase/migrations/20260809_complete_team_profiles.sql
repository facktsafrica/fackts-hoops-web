begin;

create extension if not exists pgcrypto;

create table if not exists public.team_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  team_type text not null default 'basketball_team',
  description text,
  logo_url text,
  cover_image_url text,
  city text,
  country text not null default 'Kenya',
  founded_year integer,
  coach_name text,
  contact_email text,
  website_url text,
  is_featured boolean not null default false,
  is_public boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_profiles
  add column if not exists tagline text,
  add column if not exists organization_name text,
  add column if not exists division text,
  add column if not exists age_category text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text,
  add column if not exists current_competition text,
  add column if not exists assistant_coach_name text,
  add column if not exists manager_name text,
  add column if not exists manager_title text,
  add column if not exists contact_phone text,
  add column if not exists instagram_url text,
  add column if not exists aliases text[] not null default '{}'::text[],
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by text,
  add column if not exists claim_status text not null default 'unclaimed';

alter table public.team_profiles
  drop constraint if exists team_profiles_verification_status_check,
  drop constraint if exists team_profiles_claim_status_check,
  drop constraint if exists team_profiles_founded_year_check;

alter table public.team_profiles
  add constraint team_profiles_verification_status_check
    check (verification_status in ('unverified','pending','verified','disputed')),
  add constraint team_profiles_claim_status_check
    check (claim_status in ('unclaimed','pending','claimed','restricted')),
  add constraint team_profiles_founded_year_check
    check (founded_year is null or founded_year between 1900 and 2100);

create table if not exists public.team_roster_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  guest_hooper_id uuid references public.guest_hoopers(id) on delete set null,
  display_name text not null,
  nickname text,
  jersey_number text,
  position text,
  role text not null default 'Player',
  photo_url text,
  status text not null default 'active',
  is_public boolean not null default true,
  display_order integer not null default 100,
  joined_at date,
  left_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_roster_members
  add column if not exists is_captain boolean not null default false;

alter table public.team_roster_members
  drop constraint if exists team_roster_members_status_check,
  drop constraint if exists team_roster_members_identity_check;

alter table public.team_roster_members
  add constraint team_roster_members_status_check
    check (status in ('active','inactive','alumni')),
  add constraint team_roster_members_identity_check
    check (
      player_id is not null
      or guest_hooper_id is not null
      or length(trim(display_name)) > 0
    );

create table if not exists public.team_games (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  game_id text,
  title text,
  competition_name text,
  opponent_name text not null,
  game_date timestamptz,
  venue text,
  status text not null default 'scheduled',
  team_score integer,
  opponent_score integer,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_games
  add column if not exists event_id text,
  add column if not exists result text,
  add column if not exists home_away text,
  add column if not exists image_url text;

alter table public.team_games
  drop constraint if exists team_games_result_check,
  drop constraint if exists team_games_home_away_check;

alter table public.team_games
  add constraint team_games_result_check
    check (result is null or result in ('W','L','D')),
  add constraint team_games_home_away_check
    check (home_away is null or home_away in ('home','away'));

create table if not exists public.team_training_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  title text not null,
  session_date timestamptz,
  venue text,
  focus_area text,
  summary text,
  image_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_media (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  title text not null,
  media_type text not null default 'video',
  url text not null,
  thumbnail_url text,
  published_at timestamptz,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_media
  add column if not exists platform text,
  add column if not exists rights_status text not null default 'approved',
  add column if not exists publish_status text not null default 'published',
  add column if not exists display_order integer not null default 100;

create table if not exists public.team_event_links (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  event_id text not null references public.event_case_studies(event_id) on delete cascade,
  participation_status text not null default 'recorded',
  division text,
  final_position text,
  is_public boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, event_id)
);

create table if not exists public.team_profile_claims (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  request_type text not null default 'claim',
  requester_name text not null,
  work_email text not null,
  phone text,
  role text not null,
  organization_name text,
  evidence_url text,
  message text,
  status text not null default 'pending',
  admin_response text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (request_type in ('claim','update')),
  check (status in ('pending','approved','rejected','withdrawn')),
  check (position('@' in work_email) > 1)
);

alter table public.games
  add column if not exists home_team_id uuid references public.team_profiles(id) on delete set null,
  add column if not exists away_team_id uuid references public.team_profiles(id) on delete set null;

create index if not exists team_profiles_public_order_idx
  on public.team_profiles(is_public, is_featured desc, display_order, name);
create index if not exists team_roster_team_status_idx
  on public.team_roster_members(team_id, status, display_order);
create index if not exists team_games_team_date_idx
  on public.team_games(team_id, game_date desc);
create index if not exists team_training_team_date_idx
  on public.team_training_sessions(team_id, session_date desc);
create index if not exists team_media_team_date_idx
  on public.team_media(team_id, display_order, published_at desc);
create index if not exists team_event_links_team_order_idx
  on public.team_event_links(team_id, display_order);
create index if not exists team_claims_team_status_idx
  on public.team_profile_claims(team_id, status, created_at desc);
create index if not exists games_home_team_date_idx
  on public.games(home_team_id, game_date desc);
create index if not exists games_away_team_date_idx
  on public.games(away_team_id, game_date desc);

alter table public.team_profiles enable row level security;
alter table public.team_roster_members enable row level security;
alter table public.team_games enable row level security;
alter table public.team_training_sessions enable row level security;
alter table public.team_media enable row level security;
alter table public.team_event_links enable row level security;
alter table public.team_profile_claims enable row level security;

drop policy if exists "Public team profiles are readable" on public.team_profiles;
create policy "Public team profiles are readable"
  on public.team_profiles for select
  using (is_public = true);

drop policy if exists "Public team roster is readable" on public.team_roster_members;
create policy "Public team roster is readable"
  on public.team_roster_members for select
  using (
    is_public = true and exists (
      select 1 from public.team_profiles team
      where team.id = team_id and team.is_public = true
    )
  );

drop policy if exists "Public team games are readable" on public.team_games;
create policy "Public team games are readable"
  on public.team_games for select
  using (
    is_public = true and exists (
      select 1 from public.team_profiles team
      where team.id = team_id and team.is_public = true
    )
  );

drop policy if exists "Public team training is readable" on public.team_training_sessions;
create policy "Public team training is readable"
  on public.team_training_sessions for select
  using (
    is_public = true and exists (
      select 1 from public.team_profiles team
      where team.id = team_id and team.is_public = true
    )
  );

drop policy if exists "Public team media is readable" on public.team_media;
create policy "Public team media is readable"
  on public.team_media for select
  using (
    is_public = true and publish_status = 'published' and exists (
      select 1 from public.team_profiles team
      where team.id = team_id and team.is_public = true
    )
  );

drop policy if exists "Public team event links are readable" on public.team_event_links;
create policy "Public team event links are readable"
  on public.team_event_links for select
  using (
    is_public = true and exists (
      select 1 from public.team_profiles team
      where team.id = team_id and team.is_public = true
    )
  );

drop policy if exists "Public can submit team profile claims" on public.team_profile_claims;
create policy "Public can submit team profile claims"
  on public.team_profile_claims for insert to anon, authenticated
  with check (
    status = 'pending'
    and admin_response is null
    and reviewed_at is null
    and reviewed_by is null
  );

drop policy if exists "Approved admins manage team profiles" on public.team_profiles;
create policy "Approved admins manage team profiles"
  on public.team_profiles for all to authenticated
  using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true))
  with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true));

drop policy if exists "Approved admins manage team roster" on public.team_roster_members;
create policy "Approved admins manage team roster"
  on public.team_roster_members for all to authenticated
  using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true))
  with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true));

drop policy if exists "Approved admins manage team games" on public.team_games;
create policy "Approved admins manage team games"
  on public.team_games for all to authenticated
  using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true))
  with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true));

drop policy if exists "Approved admins manage team training" on public.team_training_sessions;
create policy "Approved admins manage team training"
  on public.team_training_sessions for all to authenticated
  using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true))
  with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true));

drop policy if exists "Approved admins manage team media" on public.team_media;
create policy "Approved admins manage team media"
  on public.team_media for all to authenticated
  using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true))
  with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true));

drop policy if exists "Approved admins manage team event links" on public.team_event_links;
create policy "Approved admins manage team event links"
  on public.team_event_links for all to authenticated
  using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true))
  with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true));

drop policy if exists "Approved admins manage team claims" on public.team_profile_claims;
create policy "Approved admins manage team claims"
  on public.team_profile_claims for all to authenticated
  using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true))
  with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true));

grant select on public.team_profiles, public.team_roster_members, public.team_games,
  public.team_training_sessions, public.team_media, public.team_event_links to anon, authenticated;
grant insert on public.team_profile_claims to anon, authenticated;
grant all on public.team_profiles, public.team_roster_members, public.team_games,
  public.team_training_sessions, public.team_media, public.team_event_links,
  public.team_profile_claims to authenticated;

insert into public.team_profiles (
  slug, name, short_name, tagline, organization_name, team_type, division,
  description, logo_url, cover_image_url, primary_color, secondary_color,
  city, country, aliases, verification_status, claim_status,
  is_featured, is_public, display_order
)
values (
  'fackts-africa',
  'FACKTS Africa',
  'FACKTS',
  'Basketball, documented properly.',
  'FACKTS Africa',
  'FACKTS organization team',
  'Open',
  'The home team and player-development identity behind FACKTS Hoops, FACKTS Kings and FACKTS basketball documentation.',
  '/fackts-hoops-logo.png',
  '/images/one-on-one-bg.png',
  '#0B1F3A',
  '#F58220',
  'Nairobi',
  'Kenya',
  array['FACKTS','FACKTS Africa','FACKTS Hoops'],
  'verified',
  'claimed',
  true,
  true,
  0
)
on conflict (slug) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  tagline = coalesce(public.team_profiles.tagline, excluded.tagline),
  organization_name = coalesce(public.team_profiles.organization_name, excluded.organization_name),
  logo_url = coalesce(public.team_profiles.logo_url, excluded.logo_url),
  cover_image_url = coalesce(public.team_profiles.cover_image_url, excluded.cover_image_url),
  primary_color = coalesce(public.team_profiles.primary_color, excluded.primary_color),
  secondary_color = coalesce(public.team_profiles.secondary_color, excluded.secondary_color),
  city = coalesce(public.team_profiles.city, excluded.city),
  country = coalesce(public.team_profiles.country, excluded.country),
  aliases = case when cardinality(public.team_profiles.aliases) = 0 then excluded.aliases else public.team_profiles.aliases end,
  verification_status = 'verified',
  claim_status = 'claimed',
  is_featured = true,
  is_public = true,
  display_order = 0,
  updated_at = now();

comment on table public.team_profiles is
  'Permanent organization and team identities. Event-only participants remain in event_records and never enter this table automatically.';
comment on table public.team_event_links is
  'Controlled links between a permanent team and an event it actually participated in.';
comment on table public.team_profile_claims is
  'Private verification queue for organization representatives requesting profile ownership or corrections.';
comment on column public.games.home_team_id is
  'Optional permanent team-profile link; event-only team names remain valid without this relationship.';

commit;
