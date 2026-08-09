begin;

insert into public.competitions (
  slug,
  name,
  short_name,
  summary,
  description,
  competition_format,
  organizer_name,
  current_season_label,
  status,
  venue,
  location,
  cover_image_url,
  logo_url,
  rules_summary,
  verification_status,
  is_public,
  is_featured
)
values (
  'court-takeovers',
  'Court Takeovers',
  'Court Takeovers',
  'The FACKTS court-based competition series, built to connect matchups, player records and media. High School Takeovers and University Takeovers will become dedicated divisions as the series expands.',
  'Court Takeovers is a permanent FACKTS competition family. The current record remains unified while the High School Takeovers and University Takeovers divisions are prepared for separate fixtures, standings, player records and media.',
  'Takeover series',
  'FACKTS Africa',
  'Current series',
  'live',
  'Multiple courts',
  'Kenya',
  '/images/one-on-one-bg.png',
  '/fackts-hoops-logo.png',
  'High School and University records will remain separated when those divisions launch.',
  'published',
  true,
  false
)
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  summary = excluded.summary,
  description = excluded.description,
  competition_format = excluded.competition_format,
  organizer_name = excluded.organizer_name,
  current_season_label = excluded.current_season_label,
  status = excluded.status,
  venue = excluded.venue,
  location = excluded.location,
  rules_summary = excluded.rules_summary,
  verification_status = excluded.verification_status,
  is_public = true,
  updated_at = now();

commit;
