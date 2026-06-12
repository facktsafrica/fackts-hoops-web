insert into storage.buckets (id, name, public)
values ('calendar-posters', 'calendar-posters', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public read calendar posters" on storage.objects;
drop policy if exists "Allow admin upload calendar posters" on storage.objects;
drop policy if exists "Allow admin update calendar posters" on storage.objects;
drop policy if exists "Allow admin delete calendar posters" on storage.objects;

create policy "Allow public read calendar posters"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'calendar-posters');

create policy "Allow admin upload calendar posters"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'calendar-posters'
  and public.is_fackts_admin()
);

create policy "Allow admin update calendar posters"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'calendar-posters'
  and public.is_fackts_admin()
)
with check (
  bucket_id = 'calendar-posters'
  and public.is_fackts_admin()
);

create policy "Allow admin delete calendar posters"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'calendar-posters'
  and public.is_fackts_admin()
);