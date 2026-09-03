begin;

-- A game belongs to one basketball context. Team participation remains
-- authoritative through home_team_id / away_team_id; owning or covering a
-- competition never makes its games fixtures for the FACKTS team.
alter table public.games
  add column if not exists game_category text,
  add column if not exists competition_id uuid references public.competitions(id) on delete set null;

alter table public.team_games
  add column if not exists game_category text,
  add column if not exists competition_id uuid references public.competitions(id) on delete set null,
  add column if not exists season_label text,
  add column if not exists division text;

update public.games g
set competition_id = c.id
from public.competitions c
where g.competition_id is null
  and (
    (c.slug = 'fackts-kings' and lower(concat_ws(' ', g.competition_name, g.match_type, g.game_format, g.title, g.game_title)) ~ '(fackts[ -]?kings|1[ ]*v[ ]*1|one[ -]?on[ -]?one)')
    or
    (c.slug = 'court-takeovers' and lower(concat_ws(' ', g.competition_name, g.match_type, g.game_format, g.title, g.game_title)) ~ '(court|community|school|university|campus).{0,20}take[ -]?over')
  );

update public.games
set game_category = case
  when lower(concat_ws(' ', competition_name, match_type, game_format, title, game_title)) ~ '(court|community|school|university|campus).{0,20}take[ -]?over'
    then 'court_takeover'
  when lower(concat_ws(' ', competition_name, match_type, game_format, title, game_title)) ~ '(fackts[ -]?kings|1[ ]*v[ ]*1|one[ -]?on[ -]?one)'
    then 'one_on_one'
  when league_id is not null then 'league'
  when event_id is not null then 'event'
  when lower(concat_ws(' ', competition_name, match_type, title, game_title)) ~ '(friendly|scrimmage)'
    then 'friendly'
  when competition_id is not null
    or nullif(trim(coalesce(competition_name, '')), '') is not null
    then 'competition'
  else 'other'
end
where game_category is null or trim(game_category) = '';

-- Legacy Kings rows inherited the then-current 2026 default. The played date
-- is authoritative when that default conflicts with the match year.
update public.guest_one_on_one_stats
set season_label = extract(year from match_date)::integer::text
where competition_slug = 'fackts-kings'
  and match_date is not null
  and season_label = '2026'
  and extract(year from match_date)::integer <> 2026;

update public.games
set
  season_label = extract(year from game_date)::integer::text,
  updated_at = now()
where game_category = 'one_on_one'
  and game_date is not null
  and season_label = '2026'
  and extract(year from game_date)::integer <> 2026;

-- Fill missing league context only when the participating team has exactly
-- one unambiguous membership in that league. Games with multiple possible
-- season/division destinations remain unassigned for admin review.
with game_membership_context as (
  select
    g.id as game_id,
    min(m.season_label) as season_label,
    min(m.division) as division
  from public.games g
  join public.team_league_memberships m
    on m.league_id = g.league_id
   and m.team_id in (g.home_team_id, g.away_team_id)
   and m.status <> 'withdrawn'
  where g.league_id is not null
    and (nullif(trim(g.season_label), '') is null or nullif(trim(g.division), '') is null)
  group by g.id
  having count(distinct (m.season_label, m.division)) = 1
)
update public.games g
set
  season_label = coalesce(nullif(trim(g.season_label), ''), c.season_label),
  division = coalesce(nullif(trim(g.division), ''), c.division)
from game_membership_context c
where c.game_id = g.id;

-- Preserve legacy team-game rows while inheriting context from their
-- canonical game whenever one is linked.
update public.team_games tg
set
  game_category = coalesce(nullif(trim(tg.game_category), ''), g.game_category),
  competition_id = coalesce(tg.competition_id, g.competition_id),
  league_id = coalesce(tg.league_id, g.league_id),
  season_label = coalesce(nullif(trim(tg.season_label), ''), g.season_label),
  division = coalesce(nullif(trim(tg.division), ''), g.division)
from public.games g
where tg.game_id = g.id::text;

with team_membership_context as (
  select
    tg.id as team_game_id,
    min(m.season_label) as season_label,
    min(m.division) as division
  from public.team_games tg
  join public.team_league_memberships m
    on m.league_id = tg.league_id
   and m.team_id = tg.team_id
   and m.status <> 'withdrawn'
  where tg.league_id is not null
    and (nullif(trim(tg.season_label), '') is null or nullif(trim(tg.division), '') is null)
  group by tg.id
  having count(distinct (m.season_label, m.division)) = 1
)
update public.team_games tg
set
  season_label = coalesce(nullif(trim(tg.season_label), ''), c.season_label),
  division = coalesce(nullif(trim(tg.division), ''), c.division)
from team_membership_context c
where c.team_game_id = tg.id;

update public.team_games
set game_category = case
  when lower(concat_ws(' ', competition_name, title)) ~ '(court|community|school|university|campus).{0,20}take[ -]?over'
    then 'court_takeover'
  when lower(concat_ws(' ', competition_name, title)) ~ '(fackts[ -]?kings|1[ ]*v[ ]*1|one[ -]?on[ -]?one)'
    then 'one_on_one'
  when league_id is not null then 'league'
  when event_id is not null then 'event'
  when lower(concat_ws(' ', competition_name, title)) ~ '(friendly|scrimmage)'
    then 'friendly'
  when competition_id is not null
    or nullif(trim(coalesce(competition_name, '')), '') is not null
    then 'competition'
  else 'other'
end
where game_category is null or trim(game_category) = '';

update public.games
set
  game_format = coalesce(nullif(trim(game_format), ''), '1v1'),
  match_type = coalesce(nullif(trim(match_type), ''), '1v1')
where game_category = 'one_on_one';

alter table public.games drop constraint if exists games_game_category_check;
alter table public.games add constraint games_game_category_check
  check (game_category in ('one_on_one', 'league', 'court_takeover', 'event', 'competition', 'friendly', 'other'));

alter table public.team_games drop constraint if exists team_games_game_category_check;
alter table public.team_games add constraint team_games_game_category_check
  check (game_category in ('one_on_one', 'league', 'court_takeover', 'event', 'competition', 'friendly', 'other'));

create index if not exists games_category_date_idx
  on public.games(game_category, game_date desc);

create index if not exists games_competition_season_division_idx
  on public.games(competition_id, season_label, division, game_date desc);

create index if not exists games_league_season_division_teams_idx
  on public.games(league_id, season_label, division, home_team_id, away_team_id);

create index if not exists team_games_context_idx
  on public.team_games(team_id, game_category, league_id, season_label, division, game_date desc);

comment on column public.games.game_category is
  'Exclusive game context used for directory grouping and counting. Ownership does not imply team participation.';

comment on column public.games.competition_id is
  'Permanent competition relationship. League games use league_id; one-off tournaments use event_id.';

commit;
