begin;

create extension if not exists pgcrypto;

create table if not exists public.fackts_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_role text not null,
  recipient_source text not null,
  recipient_id uuid not null,
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  title text not null,
  body text,
  notification_type text not null default 'general',
  link_url text not null default '/player',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.fackts_notifications
  add column if not exists recipient_role text,
  add column if not exists recipient_source text,
  add column if not exists recipient_id uuid,
  add column if not exists recipient_name text,
  add column if not exists recipient_email text,
  add column if not exists recipient_phone text,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists notification_type text default 'general',
  add column if not exists link_url text default '/player',
  add column if not exists is_read boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists read_at timestamptz;

create index if not exists fackts_notifications_recipient_idx
  on public.fackts_notifications(recipient_role, recipient_id, created_at desc);

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

alter table public.admin_profiles
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists is_super_admin boolean not null default false,
  add column if not exists permissions text[] not null default '{}'::text[],
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Existing administrators predate capability controls. Keep them fully
-- operational during the upgrade. New mini admins are created with
-- is_super_admin=false and an explicit permission list.
update public.admin_profiles
set
  is_super_admin = true,
  updated_at = now()
where is_active = true
  and coalesce(array_length(permissions, 1), 0) = 0;

create table if not exists public.player_activity_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  player_name text not null,
  event_type text not null,
  title text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists player_activity_events_created_at_idx
  on public.player_activity_events(created_at desc);

create index if not exists player_activity_events_player_id_idx
  on public.player_activity_events(player_id, created_at desc);

create table if not exists public.push_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  notification_type text not null,
  title text not null,
  delivery_status text not null,
  status_code integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists push_delivery_logs_created_at_idx
  on public.push_delivery_logs(created_at desc);

alter table public.fackts_notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.player_activity_events enable row level security;
alter table public.push_delivery_logs enable row level security;

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

drop policy if exists "admins_read_player_activity" on public.player_activity_events;
create policy "admins_read_player_activity"
  on public.player_activity_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_profiles
      where admin_profiles.user_id = auth.uid()
        and admin_profiles.is_active = true
        and (
          admin_profiles.is_super_admin = true
          or 'activity' = any(admin_profiles.permissions)
        )
    )
  );

drop policy if exists "users_read_own_push_delivery_logs" on public.push_delivery_logs;
create policy "users_read_own_push_delivery_logs"
  on public.push_delivery_logs
  for select
  to authenticated
  using (user_id = auth.uid());

commit;

select
  'FACKTS admin upgrade installed successfully' as result,
  (select count(*) from public.admin_profiles where is_super_admin = true) as super_admins,
  (select count(*) from public.fackts_notifications) as notification_rows,
  (select count(*) from public.push_subscriptions) as push_subscriptions;
