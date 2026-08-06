-- Health Checkup Cup 2025: confirmed historical event data.
-- Safe to rerun. Existing Admin records are preserved and duplicates are avoided.

do $$
declare
  event_key constant text := 'fackts-africa-health-checkup-cup-2025';
begin
  update public.event_case_studies
  set
    title = 'FACKTS Africa Health Checkup Cup 2025',
    slug = 'fackts-africa-health-checkup-cup-2025',
    summary = 'A three-day men''s and women''s basketball tournament hosted at KMTC Upper Hill and documented by FACKTS Hoops.',
    venue = 'KMTC Upper Hill',
    location = 'Nairobi, Upper Hill',
    status = 'published',
    men_division = true,
    women_division = true,
    photo_count = greatest(photo_count, 500),
    is_public = true,
    updated_at = now()
  where event_id = event_key;

  -- Remove historical names already confirmed as incorrect.
  delete from public.event_records
  where event_id = event_key
    and record_type = 'team'
    and lower(title) in ('war dogs', 'facts society', 'fackts wba', 'fackts nba');

  -- Confirmed participating teams. Rosters can be completed in Admin without
  -- recreating the team records.
  insert into public.event_records
    (event_id, record_type, title, division, status, is_public, sort_order, metadata)
  select event_key, 'team', seed.title, seed.division, 'published', true, seed.sort_order,
         jsonb_build_object('roster_status', 'pending verification', 'historical_seed', true)
  from (values
    ('Aces', 'Women', 1),
    ('Wizards', 'Men', 2),
    ('Usiku SACCO', 'Men', 3),
    ('Safe Spaces', 'Men', 4),
    ('Nuru', 'Men', 5),
    ('Tigers', 'Men', 6),
    ('Boys Odit', 'Men', 7),
    ('Nexgen', 'Men', 8),
    ('Fun Society', 'Men', 9),
    ('Don Bosco / DP Savio', 'Men', 10),
    ('FACKTS Hoops', 'Men', 11)
  ) as seed(title, division, sort_order)
  where not exists (
    select 1 from public.event_records existing
    where existing.event_id = event_key
      and existing.record_type = 'team'
      and lower(existing.title) = lower(seed.title)
  );

  -- Confirmed event partners.
  insert into public.event_records
    (event_id, record_type, title, subtitle, details, status, is_public, sort_order, metadata)
  select event_key, 'partner', seed.title, seed.subtitle, seed.details,
         'published', true, seed.sort_order, jsonb_build_object('historical_seed', true)
  from (values
    ('KMTC Upper Hill', 'Venue host', 'Hosted the three-day tournament at no charge.', 1),
    ('Made by Kelzz', 'Bag and advertising partner', 'Supported the event with bags and advertising.', 2),
    ('Wisma Insurance Agency', 'Event partner', null, 3),
    ('Physical Therapy Services Kenya', 'Event partner', null, 4),
    ('Westlands Medical Center', 'Event partner', null, 5),
    ('KIPROD Risk Management Services', 'Event partner', null, 6),
    ('Neuro Kid Warriors', 'Event partner', null, 7)
  ) as seed(title, subtitle, details, sort_order)
  where not exists (
    select 1 from public.event_records existing
    where existing.event_id = event_key
      and existing.record_type = 'partner'
      and lower(existing.title) = lower(seed.title)
  );

  -- Confirmed officials and contributors.
  insert into public.event_records
    (event_id, record_type, title, subtitle, details, status, is_public, sort_order, metadata)
  select event_key, 'person', seed.title, seed.subtitle, seed.details,
         'published', true, seed.sort_order, jsonb_build_object('historical_seed', true)
  from (values
    ('Peter', 'Referee', null, 1),
    ('Jamal', 'Referee', null, 2),
    ('Emmanuel', 'Referee', null, 3),
    ('Julian', 'Table official', null, 4),
    ('Samuel Kingori (King Ori)', 'KMTC coordination', 'Supported venue coordination.', 5),
    ('Lenny Odawa', 'Public-address support', 'Provided public-address speakers.', 6),
    ('Ham Odor', 'Security lead', 'Led Oras Empire security support.', 7),
    ('Kevin Jakait', 'Table support', null, 8),
    ('Thomas Hans', 'Coordination and scheduling', null, 9),
    ('Liam Waniki', 'MC', null, 10)
  ) as seed(title, subtitle, details, sort_order)
  where not exists (
    select 1 from public.event_records existing
    where existing.event_id = event_key
      and existing.record_type = 'person'
      and lower(existing.title) = lower(seed.title)
  );
end $$;
