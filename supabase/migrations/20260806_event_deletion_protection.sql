-- Reusable deletion protection for every current and future event.
alter table public.event_case_studies
  add column if not exists deletion_protected boolean not null default false;

-- Protect the historical flagship event on first installation.
update public.event_case_studies
set deletion_protected = true
where event_id = 'fackts-africa-health-checkup-cup-2025';
