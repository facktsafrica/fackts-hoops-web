create extension if not exists pgcrypto;

create table if not exists public.event_case_studies (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  title text not null,
  slug text not null unique,
  summary text,
  start_date date,
  end_date date,
  venue text,
  location text,
  poster_url text,
  hero_image_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  men_division boolean not null default true,
  women_division boolean not null default true,
  photo_count integer not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_records (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.event_case_studies(event_id) on delete cascade,
  record_type text not null check (record_type in ('team','person','result','partner','media','gallery','consent','prize','award')),
  title text not null,
  subtitle text,
  details text,
  division text,
  team_name text,
  opponent_name text,
  score_for integer,
  score_against integer,
  url text,
  image_url text,
  status text not null default 'draft' check (status in ('draft','verified','published','hidden','restricted','withdrawn','pending','part-paid','settled')),
  is_public boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_records_event_type_idx on public.event_records(event_id, record_type, sort_order);

alter table public.event_case_studies enable row level security;
alter table public.event_records enable row level security;

drop policy if exists "Public can read published event case studies" on public.event_case_studies;
create policy "Public can read published event case studies" on public.event_case_studies for select
using (is_public = true and status = 'published');

drop policy if exists "Public can read published event records" on public.event_records;
create policy "Public can read published event records" on public.event_records for select
using (is_public = true and status in ('verified','published'));

drop policy if exists "Approved admins manage event case studies" on public.event_case_studies;
create policy "Approved admins manage event case studies" on public.event_case_studies for all to authenticated
using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true))
with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true));

drop policy if exists "Approved admins manage event records" on public.event_records;
create policy "Approved admins manage event records" on public.event_records for all to authenticated
using (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true))
with check (exists (select 1 from public.admin_profiles ap where ap.user_id = auth.uid() and ap.is_active = true));

insert into public.event_case_studies
  (event_id, title, slug, summary, start_date, end_date, venue, location, status, men_division, women_division, photo_count, is_public)
values
  ('fackts-africa-health-checkup-cup-2025', 'FACKTS Africa Health Checkup Cup 2025', 'fackts-africa-health-checkup-cup-2025', 'A three-day men’s and women’s basketball tournament documented by FACKTS Africa.', null, null, 'KMTC Upper Hill', 'Nairobi', 'published', true, true, 500, true)
on conflict (event_id) do nothing;

insert into public.event_records (event_id, record_type, title, subtitle, details, status, is_public, sort_order)
values
  ('fackts-africa-health-checkup-cup-2025','partner','KMTC Upper Hill','Principal venue partner','Hosted the three-day event at no charge.','published',true,1),
  ('fackts-africa-health-checkup-cup-2025','partner','Made by Kelzz','Bag and advertising partner','Provided bags and external advertising support.','published',true,2),
  ('fackts-africa-health-checkup-cup-2025','person','Peter','Referee',null,'published',true,1),
  ('fackts-africa-health-checkup-cup-2025','person','Jamal','Referee',null,'published',true,2),
  ('fackts-africa-health-checkup-cup-2025','person','Emmanuel','Referee support',null,'published',true,3),
  ('fackts-africa-health-checkup-cup-2025','person','Julian','Table official',null,'published',true,4)
on conflict do nothing;

