insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view event images" on storage.objects;
create policy "Public can view event images"
on storage.objects for select
using (bucket_id = 'event-images');

drop policy if exists "Approved admins upload event images" on storage.objects;
create policy "Approved admins upload event images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-images'
  and exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid() and ap.is_active = true
  )
);

drop policy if exists "Approved admins update event images" on storage.objects;
create policy "Approved admins update event images"
on storage.objects for update to authenticated
using (
  bucket_id = 'event-images'
  and exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid() and ap.is_active = true
  )
)
with check (
  bucket_id = 'event-images'
  and exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid() and ap.is_active = true
  )
);

drop policy if exists "Approved admins delete event images" on storage.objects;
create policy "Approved admins delete event images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-images'
  and exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid() and ap.is_active = true
  )
);
