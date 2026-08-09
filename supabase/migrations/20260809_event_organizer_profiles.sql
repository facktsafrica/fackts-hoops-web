alter table public.event_case_studies
  add column if not exists organizer_name text,
  add column if not exists organizer_logo_url text,
  add column if not exists organizer_description text,
  add column if not exists organizer_url text;

comment on column public.event_case_studies.organizer_name is 'Public-facing organization responsible for the event.';
comment on column public.event_case_studies.organizer_logo_url is 'Official organizer logo used in the Event Hub.';
comment on column public.event_case_studies.organizer_description is 'Approved About the Organizer copy for the Event Hub.';
comment on column public.event_case_studies.organizer_url is 'Organizer website or official social profile.';

update public.event_case_studies
set
  organizer_name = coalesce(organizer_name, 'FACKTS Africa'),
  organizer_description = coalesce(
    organizer_description,
    'FACKTS Africa documents basketball through verified statistics, event coverage, media and connected player, team and competition profiles.'
  )
where event_id = 'fackts-africa-health-checkup-cup-2025';
