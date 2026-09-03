begin;

-- Court Takeovers and other permanent competitions use the played year as a
-- safe legacy season boundary when an older record has no explicit season.
update public.games
set season_label = extract(year from game_date)::integer::text
where game_category in ('court_takeover', 'competition')
  and nullif(trim(coalesce(season_label, '')), '') is null
  and game_date is not null;

-- Team Portal report imports historically stored "team_report" as a public
-- match type. Resolve an unambiguous league membership from either canonical
-- team IDs or the linked team_games record, then attach the real league
-- context without requiring every opponent to have a permanent team profile.
with participant_teams as (
  select g.id as game_id, g.home_team_id as team_id
  from public.games g
  where g.home_team_id is not null
  union
  select g.id as game_id, g.away_team_id as team_id
  from public.games g
  where g.away_team_id is not null
  union
  select g.id as game_id, tg.team_id
  from public.games g
  join public.team_games tg on tg.game_id = g.id::text
  where tg.team_id is not null
),
candidate_contexts as (
  select distinct
    g.id as game_id,
    membership.league_id,
    membership.season_label,
    membership.division
  from public.games g
  join participant_teams participant on participant.game_id = g.id
  join public.team_league_memberships membership
    on membership.team_id = participant.team_id
   and membership.status <> 'withdrawn'
  where (
      lower(trim(coalesce(g.match_type, ''))) = 'team_report'
      or lower(trim(coalesce(g.competition_name, ''))) = 'team_report'
    )
    and (
      nullif(trim(coalesce(g.season_label, '')), '') is null
      or lower(trim(g.season_label)) = lower(trim(membership.season_label))
    )
    and (
      nullif(trim(coalesce(g.division, '')), '') is null
      or lower(trim(g.division)) = lower(trim(membership.division))
    )
),
unambiguous_contexts as (
  select context.*
  from candidate_contexts context
  join (
    select game_id
    from candidate_contexts
    group by game_id
    having count(*) = 1
  ) unique_game on unique_game.game_id = context.game_id
)
update public.games game
set
  game_category = 'league',
  league_id = context.league_id,
  season_label = coalesce(nullif(trim(game.season_label), ''), context.season_label),
  division = coalesce(nullif(trim(game.division), ''), context.division),
  competition_name = league.name,
  game_format = case
    when lower(trim(coalesce(game.game_format, ''))) in ('', 'team_report') then '5v5'
    else trim(game.game_format)
  end,
  match_type = case
    when lower(trim(coalesce(game.game_format, ''))) in ('', 'team_report') then '5v5'
    else trim(game.game_format)
  end,
  updated_at = now()
from unambiguous_contexts context
join public.leagues league on league.id = context.league_id
where game.id = context.game_id;

-- Never expose the internal import slug as the public competition or format.
update public.games
set
  game_category = case
    when league_id is not null then 'league'
    when game_category = 'competition' then 'other'
    else coalesce(nullif(trim(game_category), ''), 'other')
  end,
  competition_name = case
    when lower(trim(coalesce(competition_name, ''))) = 'team_report'
      then 'Team game'
    else competition_name
  end,
  game_format = case
    when lower(trim(coalesce(game_format, ''))) in ('', 'team_report') then '5v5'
    else trim(game_format)
  end,
  match_type = case
    when lower(trim(coalesce(match_type, ''))) = 'team_report'
      then case
        when lower(trim(coalesce(game_format, ''))) in ('', 'team_report') then '5v5'
        else trim(game_format)
      end
    else coalesce(nullif(trim(match_type), ''), '5v5')
  end,
  updated_at = now()
where lower(trim(coalesce(match_type, ''))) = 'team_report'
   or lower(trim(coalesce(competition_name, ''))) = 'team_report';

-- Keep linked legacy team rows in the same context as the canonical game.
update public.team_games team_game
set
  game_category = game.game_category,
  competition_id = game.competition_id,
  league_id = game.league_id,
  season_label = game.season_label,
  division = game.division,
  competition_name = coalesce(nullif(trim(game.competition_name), ''), team_game.competition_name)
from public.games game
where team_game.game_id = game.id::text;

-- One canonical homepage selection record controls the four public feature
-- slots. Existing is_featured flags seed sensible fallbacks without deleting
-- or changing any current public content.
alter table public.event_case_studies
  add column if not exists is_featured boolean not null default false;

create table if not exists public.homepage_feature_settings (
  id smallint primary key default 1 check (id = 1),
  featured_team_id uuid references public.team_profiles(id) on delete set null,
  featured_event_id text references public.event_case_studies(event_id) on delete set null,
  featured_competition_id uuid references public.competitions(id) on delete set null,
  featured_player_id uuid references public.players(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.homepage_feature_settings (
  id,
  featured_team_id,
  featured_event_id,
  featured_competition_id,
  featured_player_id
)
select
  1,
  (
    select id from public.team_profiles
    where is_public = true
    order by is_featured desc, display_order asc nulls last, created_at asc
    limit 1
  ),
  (
    select event_id from public.event_case_studies
    where is_public = true and status = 'published'
    order by is_featured desc, start_date desc nulls last, created_at desc
    limit 1
  ),
  (
    select id from public.competitions
    where is_public = true
    order by is_featured desc, created_at desc
    limit 1
  ),
  (
    select id from public.players
    where is_active = true
    order by is_featured desc, created_at asc
    limit 1
  )
on conflict (id) do nothing;

create index if not exists event_case_studies_featured_idx
  on public.event_case_studies(is_public, status, is_featured, start_date desc);

alter table public.homepage_feature_settings enable row level security;

drop policy if exists "Homepage feature settings are publicly readable"
  on public.homepage_feature_settings;
create policy "Homepage feature settings are publicly readable"
  on public.homepage_feature_settings for select
  using (true);

drop policy if exists "Approved admins manage homepage features"
  on public.homepage_feature_settings;
create policy "Approved admins manage homepage features"
  on public.homepage_feature_settings for all to authenticated
  using (
    exists (
      select 1 from public.admin_profiles admin
      where admin.user_id = auth.uid() and admin.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_profiles admin
      where admin.user_id = auth.uid() and admin.is_active = true
    )
  );

grant select on public.homepage_feature_settings to anon, authenticated;
grant insert, update, delete on public.homepage_feature_settings to authenticated;

-- Prevent new records from being attached to multiple mutually exclusive
-- contexts. NOT VALID preserves any old row that still needs manual review.
alter table public.games
  drop constraint if exists games_single_context_check;
alter table public.games
  add constraint games_single_context_check
  check (num_nonnulls(event_id, league_id, competition_id) <= 1) not valid;

commit;
