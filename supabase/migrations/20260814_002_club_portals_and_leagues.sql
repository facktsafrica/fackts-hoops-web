-- FACKTS Hoops Club Portals and League Network
-- Every registered permanent team receives core club operations. Subscriptions
-- govern premium upgrades only; they never replace the canonical team record.

begin;

create extension if not exists pgcrypto;

alter table public.team_subscriptions
  drop constraint if exists team_subscriptions_plan_code_check;

update public.team_subscriptions
set plan_code = case plan_code
  when 'performance' then 'club_profile'
  when 'broadcast' then 'club_pro'
  else 'club_core'
end,
updated_at = now();

alter table public.team_subscriptions
  alter column plan_code set default 'club_core',
  alter column status set default 'active';

alter table public.team_subscriptions
  add constraint team_subscriptions_plan_code_check
    check (plan_code in ('club_core','club_profile','club_broadcast','club_pro'));

-- Core club operations belong to every registered team. A membership controls
-- who may enter; premium subscription state controls only the two upgrades.
insert into public.team_subscriptions (
  team_id,
  plan_code,
  status,
  enabled_capabilities,
  starts_at,
  notes
)
select
  team.id,
  'club_core',
  'active',
  array[
    'portal_view',
    'training_manage',
    'branding_submit',
    'media_submit',
    'roster_manage',
    'stats_submit'
  ]::text[],
  now(),
  'Core club workspace for a registered permanent team.'
from public.team_profiles team
on conflict (team_id) do update
set enabled_capabilities = array(
      select distinct capability
      from unnest(
        public.team_subscriptions.enabled_capabilities || array[
          'portal_view',
          'training_manage',
          'branding_submit',
          'media_submit',
          'roster_manage',
          'stats_submit'
        ]::text[]
      ) capability
    ),
    status = case
      when exists (
        select 1
        from public.team_portal_memberships membership
        where membership.team_id = public.team_subscriptions.team_id
          and membership.status = 'active'
      ) then 'active'
      else public.team_subscriptions.status
    end,
    starts_at = coalesce(public.team_subscriptions.starts_at, now()),
    updated_at = now();

create or replace function public.team_portal_has_capability(
  p_team_id uuid,
  p_capability text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.team_portal_memberships membership
    left join public.team_subscriptions subscription
      on subscription.team_id = membership.team_id
    where membership.team_id = p_team_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and (
        p_capability = any(array[
          'portal_view',
          'training_manage',
          'branding_submit',
          'media_submit',
          'roster_manage',
          'stats_submit'
        ]::text[])
        or (
          subscription.status in ('trial','active')
          and p_capability = any(subscription.enabled_capabilities)
          and (subscription.starts_at is null or subscription.starts_at <= now())
          and (subscription.ends_at is null or subscription.ends_at > now())
        )
      )
  );
$$;

revoke all on function public.team_portal_has_capability(uuid,text) from public;
grant execute on function public.team_portal_has_capability(uuid,text) to authenticated;

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  description text,
  country text not null default 'Kenya',
  region text,
  organizer_name text,
  logo_url text,
  cover_image_url text,
  primary_color text not null default '#0B1F3A',
  secondary_color text not null default '#F58220',
  status text not null default 'active'
    check (status in ('upcoming','active','off_season','archived')),
  is_public boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_league_memberships (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  season_label text not null default 'Current season',
  division text not null default 'Open',
  conference text,
  status text not null default 'active'
    check (status in ('active','inactive','promoted','relegated','withdrawn')),
  is_public boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, team_id, season_label, division)
);

alter table public.games
  add column if not exists league_id uuid references public.leagues(id) on delete set null;

alter table public.team_games
  add column if not exists league_id uuid references public.leagues(id) on delete set null,
  add column if not exists source_submission_id uuid references public.team_stat_submissions(id) on delete set null;

create unique index if not exists team_games_source_submission_idx
  on public.team_games(source_submission_id);

create index if not exists leagues_public_order_idx
  on public.leagues(is_public, status, display_order, name);
create index if not exists team_league_memberships_league_idx
  on public.team_league_memberships(league_id, season_label, division, status, display_order);
create index if not exists team_league_memberships_team_idx
  on public.team_league_memberships(team_id, status, season_label);
create index if not exists games_league_date_idx
  on public.games(league_id, game_date desc);
create index if not exists team_games_league_date_idx
  on public.team_games(league_id, game_date desc);

alter table public.leagues enable row level security;
alter table public.team_league_memberships enable row level security;

drop policy if exists "Public leagues are readable" on public.leagues;
create policy "Public leagues are readable"
  on public.leagues for select
  using (is_public = true);

drop policy if exists "Public league memberships are readable" on public.team_league_memberships;
create policy "Public league memberships are readable"
  on public.team_league_memberships for select
  using (
    is_public = true
    and exists (
      select 1 from public.leagues league
      where league.id = league_id and league.is_public = true
    )
    and exists (
      select 1 from public.team_profiles team
      where team.id = team_id and team.is_public = true
    )
  );

grant select on public.leagues, public.team_league_memberships to anon, authenticated;

insert into public.leagues (
  slug, name, short_name, description, country, region, organizer_name,
  primary_color, secondary_color, status, is_public, display_order
)
values
  (
    'kbf', 'Kenya Basketball Federation', 'KBF',
    'National federation league structure, including Division 1, Division 2 and Division 3.',
    'Kenya', 'National', 'Kenya Basketball Federation',
    '#111827', '#F59E0B', 'active', true, 10
  ),
  (
    'siel', 'SIEL', 'SIEL',
    'SIEL basketball league teams, seasons, standings and verified FACKTS coverage.',
    'Kenya', 'National', 'SIEL',
    '#172554', '#38BDF8', 'active', true, 20
  ),
  (
    'ncl', 'NCL', 'NCL',
    'NCL basketball league teams, seasons, standings and verified FACKTS coverage.',
    'Kenya', 'National', 'NCL',
    '#052E16', '#4ADE80', 'active', true, 30
  ),
  (
    'nba', 'National Basketball Association', 'NBA',
    'International professional basketball league reference portal.',
    'United States', 'International', 'NBA',
    '#1D428A', '#C8102E', 'active', true, 40
  )
on conflict (slug) do update
set name = excluded.name,
    short_name = excluded.short_name,
    description = excluded.description,
    country = excluded.country,
    region = excluded.region,
    organizer_name = excluded.organizer_name,
    updated_at = now();

-- Remove only the synthetic launch record created by the first portal patch.
-- The previously registered Eagles Basketball Club remains the canonical team.
do $$
declare
  canonical_team_id uuid;
  synthetic_team_id uuid;
begin
  select id into canonical_team_id
  from public.team_profiles
  where lower(name) like '%eagles basketball club%'
     or slug like 'eagles-basketball-club%'
  order by created_at asc
  limit 1;

  select id into synthetic_team_id
  from public.team_profiles
  where slug = 'eagles'
    and lower(trim(name)) = 'eagles'
    and organization_name = 'Eagles'
    and tagline = 'Training. Development. Competition.'
  limit 1;

  if canonical_team_id is not null
     and synthetic_team_id is not null
     and canonical_team_id <> synthetic_team_id then

    insert into public.team_portal_memberships (
      team_id, user_id, role, status, display_name, invited_email,
      approved_by, approved_at, last_login_at, created_at, updated_at
    )
    select
      canonical_team_id, user_id, role, status, display_name, invited_email,
      approved_by, approved_at, last_login_at, created_at, now()
    from public.team_portal_memberships
    where team_id = synthetic_team_id
    on conflict (team_id, user_id) do update
    set status = 'active',
        role = excluded.role,
        display_name = coalesce(excluded.display_name, public.team_portal_memberships.display_name),
        invited_email = coalesce(excluded.invited_email, public.team_portal_memberships.invited_email),
        updated_at = now();

    delete from public.team_portal_memberships where team_id = synthetic_team_id;

    update public.team_branding_submissions set team_id = canonical_team_id where team_id = synthetic_team_id;
    update public.team_media_submissions set team_id = canonical_team_id where team_id = synthetic_team_id;
    update public.team_stat_submissions set team_id = canonical_team_id where team_id = synthetic_team_id;
    update public.team_player_profile_requests set team_id = canonical_team_id where team_id = synthetic_team_id;
    update public.team_training_sessions set team_id = canonical_team_id where team_id = synthetic_team_id;
    update public.team_roster_members set team_id = canonical_team_id where team_id = synthetic_team_id;
    update public.team_games set team_id = canonical_team_id where team_id = synthetic_team_id;
    update public.team_media set team_id = canonical_team_id where team_id = synthetic_team_id;
    update public.team_profile_claims set team_id = canonical_team_id where team_id = synthetic_team_id;

    delete from public.team_event_links synthetic
    using public.team_event_links canonical
    where synthetic.team_id = synthetic_team_id
      and canonical.team_id = canonical_team_id
      and canonical.event_id = synthetic.event_id;
    update public.team_event_links set team_id = canonical_team_id where team_id = synthetic_team_id;

    delete from public.team_broadcasts where team_id = synthetic_team_id;
    delete from public.team_broadcast_channels where team_id = synthetic_team_id;
    delete from public.team_profiles where id = synthetic_team_id;

    update public.team_subscriptions
    set plan_code = 'club_core',
        status = 'active',
        enabled_capabilities = array(
          select distinct capability
          from unnest(
            enabled_capabilities || array[
              'portal_view', 'training_manage', 'branding_submit',
              'media_submit', 'roster_manage', 'stats_submit'
            ]::text[]
          ) capability
        ),
        starts_at = coalesce(starts_at, now()),
        notes = 'Canonical registered Eagles Basketball Club portal.',
        updated_at = now()
    where team_id = canonical_team_id;
  end if;
end $$;

-- Basketball final results are wins or losses. Equal scores remain incomplete until
-- overtime produces a winner.
update public.team_games
set result = null,
    updated_at = now()
where result not in ('W','L');

alter table public.team_games
  drop constraint if exists team_games_result_check;
alter table public.team_games
  add constraint team_games_result_check
    check (result is null or result in ('W','L'));

comment on table public.leagues is
  'Public league identities. A league contains teams and season standings; it is not a one-off event.';
comment on table public.team_league_memberships is
  'Canonical placement of a permanent team inside a league, season and division.';
comment on table public.team_subscriptions is
  'Optional club upgrades. Core portal, roster, stats, training, branding and media operations are included with every registered team.';

commit;
