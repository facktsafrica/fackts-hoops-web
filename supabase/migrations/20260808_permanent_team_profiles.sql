begin;

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
  status text not null default 'active' check (status in ('active','inactive','alumni')),
  is_public boolean not null default true,
  display_order integer not null default 100,
  joined_at date,
  left_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (player_id is not null or guest_hooper_id is not null or length(trim(display_name)) > 0)
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

create index if not exists team_profiles_public_order_idx
  on public.team_profiles(is_public, display_order, name);
create index if not exists team_roster_team_status_idx
  on public.team_roster_members(team_id, status, display_order);
create index if not exists team_games_team_date_idx
  on public.team_games(team_id, game_date desc);
create index if not exists team_training_team_date_idx
  on public.team_training_sessions(team_id, session_date desc);
create index if not exists team_media_team_date_idx
  on public.team_media(team_id, published_at desc);

alter table public.team_profiles enable row level security;
alter table public.team_roster_members enable row level security;
alter table public.team_games enable row level security;
alter table public.team_training_sessions enable row level security;
alter table public.team_media enable row level security;

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
    is_public = true and exists (
      select 1 from public.team_profiles team
      where team.id = team_id and team.is_public = true
    )
  );

insert into public.team_profiles (
  slug,
  name,
  short_name,
  team_type,
  description,
  logo_url,
  cover_image_url,
  city,
  country,
  is_featured,
  is_public,
  display_order
)
values (
  'fackts-africa',
  'FACKTS Africa',
  'FACKTS',
  'FACKTS organization team',
  'The home team and player-development identity behind FACKTS Hoops, FACKTS Kings and FACKTS basketball documentation.',
  '/fackts-hoops-logo.png',
  '/images/one-on-one-bg.png',
  'Nairobi',
  'Kenya',
  true,
  true,
  0
)
on conflict (slug) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  team_type = excluded.team_type,
  description = excluded.description,
  logo_url = excluded.logo_url,
  cover_image_url = excluded.cover_image_url,
  city = excluded.city,
  country = excluded.country,
  is_featured = excluded.is_featured,
  is_public = excluded.is_public,
  display_order = excluded.display_order,
  updated_at = now();

comment on table public.team_profiles is
  'Permanent FACKTS and client-team identities. Event participants remain in event_records and are not promoted here automatically.';

commit;
