begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users_read_own_push_subscriptions" on public.push_subscriptions;
create policy "users_read_own_push_subscriptions"
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users_create_own_push_subscriptions" on public.push_subscriptions;
create policy "users_create_own_push_subscriptions"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users_update_own_push_subscriptions" on public.push_subscriptions;
create policy "users_update_own_push_subscriptions"
  on public.push_subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users_delete_own_push_subscriptions" on public.push_subscriptions;
create policy "users_delete_own_push_subscriptions"
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

alter table public.fackts_notifications enable row level security;

drop policy if exists "players_read_own_notifications" on public.fackts_notifications;
create policy "players_read_own_notifications"
  on public.fackts_notifications
  for select
  to authenticated
  using (
    recipient_role = 'player'
    and exists (
      select 1
      from public.players
      where players.user_id = auth.uid()
        and players.id::text = fackts_notifications.recipient_id::text
        and players.is_active = true
    )
  );

drop policy if exists "players_update_own_notifications" on public.fackts_notifications;
create policy "players_update_own_notifications"
  on public.fackts_notifications
  for update
  to authenticated
  using (
    recipient_role = 'player'
    and exists (
      select 1
      from public.players
      where players.user_id = auth.uid()
        and players.id::text = fackts_notifications.recipient_id::text
        and players.is_active = true
    )
  )
  with check (
    recipient_role = 'player'
    and exists (
      select 1
      from public.players
      where players.user_id = auth.uid()
        and players.id::text = fackts_notifications.recipient_id::text
        and players.is_active = true
    )
  );

drop policy if exists "admins_read_notifications" on public.fackts_notifications;
create policy "admins_read_notifications"
  on public.fackts_notifications
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

drop policy if exists "admins_update_notifications" on public.fackts_notifications;
create policy "admins_update_notifications"
  on public.fackts_notifications
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

commit;
