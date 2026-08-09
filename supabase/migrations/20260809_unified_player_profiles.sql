begin;

create extension if not exists pgcrypto;

alter table public.players
  add column if not exists profile_headline text,
  add column if not exists cover_image_url text,
  add column if not exists profile_status text not null default 'published',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists consent_status text not null default 'not_recorded',
  add column if not exists profile_verified_at timestamptz,
  add column if not exists profile_verified_by text,
  add column if not exists achievements text;

alter table public.guest_hoopers
  add column if not exists profile_headline text,
  add column if not exists cover_image_url text,
  add column if not exists profile_status text not null default 'published',
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists consent_status text not null default 'not_recorded',
  add column if not exists profile_verified_at timestamptz,
  add column if not exists profile_verified_by text,
  add column if not exists achievements text;

alter table public.players
  drop constraint if exists players_profile_status_check,
  drop constraint if exists players_profile_verification_check,
  drop constraint if exists players_consent_status_check;

alter table public.players
  add constraint players_profile_status_check
    check (profile_status in ('draft','published','hidden')),
  add constraint players_profile_verification_check
    check (verification_status in ('unverified','pending','verified','disputed')),
  add constraint players_consent_status_check
    check (consent_status in ('not_recorded','pending','confirmed','restricted','withdrawn'));

alter table public.guest_hoopers
  drop constraint if exists guest_hoopers_profile_status_check,
  drop constraint if exists guest_hoopers_profile_verification_check,
  drop constraint if exists guest_hoopers_consent_status_check;

alter table public.guest_hoopers
  add constraint guest_hoopers_profile_status_check
    check (profile_status in ('draft','published','hidden')),
  add constraint guest_hoopers_profile_verification_check
    check (verification_status in ('unverified','pending','verified','disputed')),
  add constraint guest_hoopers_consent_status_check
    check (consent_status in ('not_recorded','pending','confirmed','restricted','withdrawn'));

create table if not exists public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  guest_hooper_id uuid references public.guest_hoopers(id) on delete cascade,
  title text not null,
  competition_name text,
  achievement_date date,
  description text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','verified','disputed')),
  verified_at timestamptz,
  verified_by text,
  is_public boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (player_id is not null and guest_hooper_id is null)
    or (player_id is null and guest_hooper_id is not null)
  )
);

create table if not exists public.player_media (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  guest_hooper_id uuid references public.guest_hoopers(id) on delete cascade,
  title text not null,
  media_type text not null default 'highlight',
  url text not null,
  thumbnail_url text,
  platform text,
  rights_status text not null default 'approved',
  publish_status text not null default 'published'
    check (publish_status in ('draft','published','hidden')),
  is_public boolean not null default true,
  display_order integer not null default 100,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (player_id is not null and guest_hooper_id is null)
    or (player_id is null and guest_hooper_id is not null)
  )
);

create index if not exists player_achievements_player_order_idx
  on public.player_achievements(player_id, display_order, achievement_date desc);
create index if not exists player_achievements_guest_order_idx
  on public.player_achievements(guest_hooper_id, display_order, achievement_date desc);
create index if not exists player_media_player_order_idx
  on public.player_media(player_id, display_order, published_at desc);
create index if not exists player_media_guest_order_idx
  on public.player_media(guest_hooper_id, display_order, published_at desc);

alter table public.player_achievements enable row level security;
alter table public.player_media enable row level security;

drop policy if exists "Public player achievements are readable" on public.player_achievements;
create policy "Public player achievements are readable"
  on public.player_achievements for select
  using (is_public = true);

drop policy if exists "Public player media is readable" on public.player_media;
create policy "Public player media is readable"
  on public.player_media for select
  using (is_public = true and publish_status = 'published');

drop policy if exists "Approved admins manage player achievements" on public.player_achievements;
create policy "Approved admins manage player achievements"
  on public.player_achievements for all to authenticated
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

drop policy if exists "Approved admins manage player media" on public.player_media;
create policy "Approved admins manage player media"
  on public.player_media for all to authenticated
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

-- One canonical, non-destructive public model. Existing source tables and stat
-- foreign keys remain intact so promotions and historical box scores cannot be
-- broken by the public-directory redesign.
create or replace view public.public_player_directory
with (security_invoker = true)
as
select
  'player:' || p.id::text as profile_key,
  p.id::text as route_id,
  'player'::text as source_type,
  p.id as player_id,
  null::uuid as guest_hooper_id,
  coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.name), ''), nullif(trim(p.nickname), ''), 'Unnamed player') as display_name,
  p.nickname,
  p.position,
  p.role,
  p.player_type as relationship_status,
  p.photo_url,
  p.photo_position,
  p.current_team,
  p.location,
  p.profile_status,
  p.verification_status,
  p.consent_status,
  p.is_featured,
  p.is_active
from public.players p
where p.is_active = true
  and p.player_type = 'fackts_player'
  and p.profile_status = 'published'

union all

select
  'guest:' || g.id::text as profile_key,
  'guest-' || g.id::text as route_id,
  'guest'::text as source_type,
  g.source_player_id as player_id,
  g.id as guest_hooper_id,
  coalesce(nullif(trim(g.full_name), ''), nullif(trim(g.nickname), ''), 'Unnamed player') as display_name,
  g.nickname,
  g.position,
  g.guest_type as role,
  g.guest_type as relationship_status,
  g.photo_url,
  g.photo_position,
  null::text as current_team,
  null::text as location,
  g.profile_status,
  g.verification_status,
  g.consent_status,
  false as is_featured,
  g.is_active
from public.guest_hoopers g
where g.is_active = true
  and g.profile_status = 'published'
  and not exists (
    select 1
    from public.players p
    where p.id = g.source_player_id
      and p.is_active = true
      and p.player_type = 'fackts_player'
  );

grant select on public.public_player_directory to anon, authenticated;

comment on view public.public_player_directory is
  'Canonical public Players directory. Official and guest source records retain their original IDs and historical stat relationships.';
comment on table public.player_media is
  'Rights-aware media linked to one canonical public player profile source.';
comment on table public.player_achievements is
  'Public player milestones with an explicit verification state.';

commit;
