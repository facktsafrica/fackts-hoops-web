begin;

update public.team_profiles
set
  current_competition = 'FACKTS Kings',
  updated_at = now()
where slug = 'fackts-africa';

insert into public.team_event_links (
  team_id,
  event_id,
  participation_status,
  division,
  is_public,
  display_order
)
select
  team.id,
  event.event_id,
  'completed',
  'Men and Women',
  true,
  10
from public.team_profiles team
join public.event_case_studies event
  on event.slug = 'fackts-africa-health-checkup-cup-2025'
where team.slug = 'fackts-africa'
on conflict (team_id, event_id) do update
set
  participation_status = excluded.participation_status,
  division = coalesce(public.team_event_links.division, excluded.division),
  is_public = true,
  display_order = least(public.team_event_links.display_order, excluded.display_order),
  updated_at = now();

commit;
