begin;

alter table public.players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists players_user_id_unique
  on public.players(user_id)
  where user_id is not null;

comment on column public.players.user_id is
  'Links one approved Supabase Auth user to one official FACKTS player profile.';

alter table public.players enable row level security;

drop policy if exists "players_read_own_account" on public.players;
create policy "players_read_own_account"
  on public.players
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "players_read_active_public" on public.players;
create policy "players_read_active_public"
  on public.players
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "admins_read_all_players" on public.players;
create policy "admins_read_all_players"
  on public.players
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_profiles
      where admin_profiles.user_id = auth.uid()
        and admin_profiles.is_active = true
    )
  );

drop policy if exists "admins_insert_players" on public.players;
create policy "admins_insert_players"
  on public.players
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_profiles
      where admin_profiles.user_id = auth.uid()
        and admin_profiles.is_active = true
    )
  );

drop policy if exists "admins_update_players" on public.players;
create policy "admins_update_players"
  on public.players
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_profiles
      where admin_profiles.user_id = auth.uid()
        and admin_profiles.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.admin_profiles
      where admin_profiles.user_id = auth.uid()
        and admin_profiles.is_active = true
    )
  );

drop policy if exists "admins_delete_players" on public.players;
create policy "admins_delete_players"
  on public.players
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.admin_profiles
      where admin_profiles.user_id = auth.uid()
        and admin_profiles.is_active = true
    )
  );

commit;
