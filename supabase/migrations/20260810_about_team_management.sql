begin;

create extension if not exists pgcrypto;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  full_name text not null,
  role_title text not null,
  public_description text not null,
  profile_photo_url text,
  initials_fallback text,
  display_order integer not null default 100,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_members_full_name_length check (char_length(full_name) between 1 and 120),
  constraint team_members_role_title_length check (char_length(role_title) between 1 and 120),
  constraint team_members_description_length check (char_length(public_description) between 1 and 500),
  constraint team_members_initials_length check (
    initials_fallback is null or char_length(initials_fallback) between 1 and 4
  )
);

create index if not exists team_members_public_order_idx
  on public.team_members(is_active, is_featured desc, display_order, created_at);

create or replace function public.set_team_member_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_team_member_updated_at();

alter table public.team_members enable row level security;

drop policy if exists "Public can read active FACKTS team members" on public.team_members;
create policy "Public can read active FACKTS team members"
  on public.team_members for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Approved admins manage FACKTS team members" on public.team_members;
create policy "Approved admins manage FACKTS team members"
  on public.team_members for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_profiles ap
      where ap.user_id = auth.uid() and ap.is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.admin_profiles ap
      where ap.user_id = auth.uid() and ap.is_active = true
    )
  );

grant select on public.team_members to anon, authenticated;
grant insert, update, delete on public.team_members to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-member-images',
  'team-member-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view FACKTS team images" on storage.objects;
create policy "Public can view FACKTS team images"
  on storage.objects for select
  using (bucket_id = 'team-member-images');

drop policy if exists "Approved admins upload FACKTS team images" on storage.objects;
create policy "Approved admins upload FACKTS team images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'team-member-images'
    and exists (
      select 1 from public.admin_profiles ap
      where ap.user_id = auth.uid() and ap.is_active = true
    )
  );

drop policy if exists "Approved admins update FACKTS team images" on storage.objects;
create policy "Approved admins update FACKTS team images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'team-member-images'
    and exists (
      select 1 from public.admin_profiles ap
      where ap.user_id = auth.uid() and ap.is_active = true
    )
  )
  with check (
    bucket_id = 'team-member-images'
    and exists (
      select 1 from public.admin_profiles ap
      where ap.user_id = auth.uid() and ap.is_active = true
    )
  );

drop policy if exists "Approved admins delete FACKTS team images" on storage.objects;
create policy "Approved admins delete FACKTS team images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'team-member-images'
    and exists (
      select 1 from public.admin_profiles ap
      where ap.user_id = auth.uid() and ap.is_active = true
    )
  );

insert into public.team_members (
  slug,
  full_name,
  role_title,
  public_description,
  initials_fallback,
  display_order,
  is_featured,
  is_active
)
values
  (
    'joseph-millighan',
    'Joseph Millighan',
    'Founder & Director',
    'Sets the vision, directs partnerships and makes the final decisions that move FACKTS forward.',
    'JM',
    10,
    true,
    true
  ),
  (
    'hanss',
    'Hanss',
    'Ideas & Basketball Lead',
    'Develops basketball concepts, talent stories and the creative direction around the game.',
    'H',
    20,
    false,
    true
  ),
  (
    'liam',
    'Liam',
    'Operations Lead',
    'Coordinates game-day delivery, schedules and the people needed to execute each activation.',
    'L',
    30,
    false,
    true
  ),
  (
    'gerito',
    'Gerito',
    'Operations Support',
    'Supports event preparation, on-court logistics and follow-through across FACKTS activities.',
    'G',
    40,
    false,
    true
  ),
  (
    'felix-matheka',
    'Felix Matheka',
    'Finance Lead',
    'Keeps financial records, supports budgets and strengthens accountability across projects.',
    'FM',
    50,
    false,
    true
  ),
  (
    'mark',
    'Mark',
    'Strategy & Partnerships',
    'Shapes growth plans and develops relationships with teams, organizers, brands and institutions.',
    'M',
    60,
    false,
    true
  ),
  (
    'damaris',
    'Damaris',
    'Administration & Executive Support',
    'Keeps documentation, coordination and executive follow-up organized behind the scenes.',
    'D',
    70,
    false,
    true
  )
on conflict (slug) do nothing;

update public.team_members
set
  full_name = 'Joseph Millighan',
  role_title = 'Founder & Director',
  initials_fallback = 'JM',
  is_featured = true,
  is_active = true
where slug = 'joseph-millighan';

commit;
