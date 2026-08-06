alter table public.event_case_studies
  add column if not exists event_type text not null default '5v5',
  add column if not exists age_category text not null default 'Open';

comment on column public.event_case_studies.event_type is 'Basketball format such as 1v1, 2v2, 3v3, 5v5, dunk contest or creators league.';
comment on column public.event_case_studies.age_category is 'Age or league category such as Open, Under 18, University, Creators or Corporate.';
