-- FACKTS Hoops Team Partner Portal / Phase 1
-- Team-scoped operations, subscription capability gates, governed submissions,
-- and encrypted YouTube connection records. Super Admin remains the publisher.

begin;

create extension if not exists pgcrypto;

alter table public.games
  add column if not exists poster_url text,
  add column if not exists game_poster_url text,
  add column if not exists video_url text,
  add column if not exists game_video_url text,
  add column if not exists highlight_url text;

-- Basketball games must be decided. A tied score is incomplete until overtime
-- produces a winner, so legacy tied result labels return to review.
update public.team_games
set result = null,
    updated_at = now()
where result = 'D';

alter table public.team_games
  drop constraint if exists team_games_result_check;

alter table public.team_games
  add constraint team_games_result_check
    check (result is null or result in ('W','L'));

create table if not exists public.team_subscriptions (
  team_id uuid primary key references public.team_profiles(id) on delete cascade,
  plan_code text not null default 'training_partner'
    check (plan_code in ('training_partner','team_operations','performance','broadcast')),
  status text not null default 'paused'
    check (status in ('trial','active','paused','expired','cancelled')),
  enabled_capabilities text[] not null default array['portal_view']::text[],
  starts_at timestamptz,
  ends_at timestamptz,
  approved_by uuid references public.admin_profiles(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    enabled_capabilities <@ array[
      'portal_view',
      'training_manage',
      'branding_submit',
      'media_submit',
      'roster_manage',
      'stats_submit',
      'player_profile_request',
      'broadcast_manage'
    ]::text[]
  )
);

create table if not exists public.team_portal_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'manager'
    check (role in ('owner','manager','coach','statistician','media','viewer')),
  status text not null default 'active'
    check (status in ('invited','active','paused','revoked')),
  display_name text,
  invited_email text,
  approved_by uuid references public.admin_profiles(id) on delete set null,
  approved_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.team_branding_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  asset_type text not null check (asset_type in ('hero','logo')),
  file_url text not null check (length(trim(file_url)) > 0),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','withdrawn')),
  review_note text,
  reviewed_by uuid references public.admin_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_media_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  owner_type text not null check (owner_type in ('team','game','training')),
  owner_id text not null check (length(trim(owner_id)) > 0),
  link_role text not null default 'attachment',
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','withdrawn')),
  review_note text,
  reviewed_by uuid references public.admin_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_stat_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  game_id text not null check (length(trim(game_id)) > 0),
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  stat_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','withdrawn')),
  review_note text,
  reviewed_by uuid references public.admin_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_player_profile_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  roster_member_id uuid references public.team_roster_members(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  requested_changes jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','withdrawn')),
  review_note text,
  reviewed_by uuid references public.admin_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (roster_member_id is not null or player_id is not null)
);

create table if not exists public.team_broadcast_channels (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  provider text not null default 'youtube' check (provider = 'youtube'),
  channel_id text,
  channel_title text,
  credentials_encrypted text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}'::text[],
  status text not null default 'connected'
    check (status in ('connected','attention','disconnected','revoked')),
  connected_by_user_id uuid references auth.users(id) on delete set null,
  connected_by_admin_id uuid references public.admin_profiles(id) on delete set null,
  connected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, provider)
);

create table if not exists public.team_broadcasts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.team_profiles(id) on delete cascade,
  channel_id uuid not null references public.team_broadcast_channels(id) on delete restrict,
  game_id text,
  training_session_id uuid references public.team_training_sessions(id) on delete set null,
  broadcast_type text not null default 'game'
    check (broadcast_type in ('game','training','show')),
  title text not null,
  description text,
  scheduled_start timestamptz not null,
  privacy_status text not null default 'unlisted'
    check (privacy_status in ('private','unlisted','public')),
  status text not null default 'scheduled'
    check (status in ('scheduled','testing','live','complete','cancelled','failed')),
  youtube_broadcast_id text,
  youtube_stream_id text,
  watch_url text,
  ingestion_address text,
  stream_name_encrypted text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_admin_id uuid references public.admin_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (game_id is not null or training_session_id is not null or broadcast_type = 'show')
);

alter table public.team_training_sessions
  add column if not exists submitted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists submission_status text not null default 'published',
  add column if not exists review_note text,
  add column if not exists reviewed_by uuid references public.admin_profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.team_training_sessions
  drop constraint if exists team_training_submission_status_check;

alter table public.team_training_sessions
  add constraint team_training_submission_status_check
    check (submission_status in ('draft','pending','published','rejected','cancelled'));

create index if not exists team_memberships_user_status_idx
  on public.team_portal_memberships(user_id, status, team_id);
create index if not exists team_branding_review_idx
  on public.team_branding_submissions(status, created_at desc);
create index if not exists team_media_review_idx
  on public.team_media_submissions(status, created_at desc);
create index if not exists team_stats_review_idx
  on public.team_stat_submissions(status, created_at desc);
create index if not exists team_profile_requests_review_idx
  on public.team_player_profile_requests(status, created_at desc);
create index if not exists team_broadcasts_team_start_idx
  on public.team_broadcasts(team_id, scheduled_start desc);

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
    join public.team_subscriptions subscription on subscription.team_id = membership.team_id
    where membership.team_id = p_team_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and subscription.status in ('trial','active')
      and p_capability = any(subscription.enabled_capabilities)
      and (subscription.starts_at is null or subscription.starts_at <= now())
      and (subscription.ends_at is null or subscription.ends_at > now())
  );
$$;

revoke all on function public.team_portal_has_capability(uuid,text) from public;
grant execute on function public.team_portal_has_capability(uuid,text) to authenticated;

alter table public.team_subscriptions enable row level security;
alter table public.team_portal_memberships enable row level security;
alter table public.team_branding_submissions enable row level security;
alter table public.team_media_submissions enable row level security;
alter table public.team_stat_submissions enable row level security;
alter table public.team_player_profile_requests enable row level security;
alter table public.team_broadcast_channels enable row level security;
alter table public.team_broadcasts enable row level security;

drop policy if exists "Team members read their membership" on public.team_portal_memberships;
create policy "Team members read their membership"
  on public.team_portal_memberships for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Team members read their subscription" on public.team_subscriptions;
create policy "Team members read their subscription"
  on public.team_subscriptions for select to authenticated
  using (exists (
    select 1 from public.team_portal_memberships membership
    where membership.team_id = team_subscriptions.team_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  ));

grant select on public.team_subscriptions, public.team_portal_memberships to authenticated;

-- Files use random object names in a public bucket; nothing is shown publicly
-- until a governed database record is approved.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-portal-media',
  'team-portal-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/avif']::text[]
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Every permanent team can be configured without altering its public record.
insert into public.team_subscriptions (team_id, plan_code, status, enabled_capabilities)
select id, 'training_partner', 'paused', array['portal_view','training_manage','branding_submit','media_submit']::text[]
from public.team_profiles
on conflict (team_id) do nothing;

-- Eagles is the launch partner. Reuse the existing permanent profile when it
-- exists, and create the smallest safe profile only when it does not.
do $$
declare
  eagles_team_id uuid;
begin
  select id into eagles_team_id
  from public.team_profiles
  where lower(trim(name)) = 'eagles' or slug = 'eagles'
  order by case when slug = 'eagles' then 0 else 1 end
  limit 1;

  if eagles_team_id is null then
    insert into public.team_profiles (
      slug, name, short_name, tagline, organization_name, team_type,
      description, city, country, verification_status, claim_status,
      is_featured, is_public, display_order
    ) values (
      'eagles', 'Eagles', 'Eagles', 'Training. Development. Competition.',
      'Eagles', 'basketball_team',
      'Eagles basketball team and FACKTS Hoops training partner.',
      'Nairobi', 'Kenya', 'pending', 'claimed', false, true, 40
    ) returning id into eagles_team_id;
  end if;

  insert into public.team_subscriptions (
    team_id, plan_code, status, enabled_capabilities, starts_at, notes
  ) values (
    eagles_team_id,
    'training_partner',
    'active',
    array['portal_view','training_manage','branding_submit','media_submit']::text[],
    now(),
    'Launch partner: training-first access. Additional modules require explicit Super Admin approval.'
  )
  on conflict (team_id) do update
  set plan_code = 'training_partner',
      status = 'active',
      enabled_capabilities = array['portal_view','training_manage','branding_submit','media_submit']::text[],
      starts_at = coalesce(public.team_subscriptions.starts_at, now()),
      notes = excluded.notes,
      updated_at = now();
end $$;

comment on table public.team_subscriptions is
  'Super-Admin-controlled team product entitlement. Capabilities never grant administrator identity or publication authority.';
comment on table public.team_player_profile_requests is
  'Team-prepared profile information. Only Super Admin may approve and apply it to an official player profile.';
comment on table public.team_broadcast_channels is
  'Server-only encrypted provider credentials. Token material must never be returned to the browser.';

commit;
