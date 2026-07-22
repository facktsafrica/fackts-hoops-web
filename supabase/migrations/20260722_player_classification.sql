begin;

-- One permanent classification field replaces role-name guessing.
alter table public.players
  add column if not exists player_type text;

update public.players
set player_type = case
  when lower(coalesce(role, '')) like '%guest%'
    or lower(coalesce(role, '')) like '%external%'
    then 'guest_legacy'
  when lower(coalesce(role, '')) like '%prospect%'
    then 'prospect'
  else 'fackts_player'
end
where player_type is null
   or player_type not in ('fackts_player', 'guest_legacy', 'prospect');

alter table public.players
  alter column player_type set default 'fackts_player',
  alter column player_type set not null;

alter table public.players
  drop constraint if exists players_player_type_check;

alter table public.players
  add constraint players_player_type_check
  check (player_type in ('fackts_player', 'guest_legacy', 'prospect'));

create index if not exists players_player_type_active_idx
  on public.players(player_type, is_active);

comment on column public.players.player_type is
  'Canonical classification. New official profiles use fackts_player; guests belong in guest_hoopers; prospect and guest_legacy preserve older records without granting player access.';

-- Preserve old guest records in the canonical guest-hoopers directory without
-- deleting the original player row or breaking historical stat references.
insert into public.guest_hoopers (
  full_name,
  nickname,
  position,
  photo_url,
  photo_position,
  notes,
  is_active
)
select
  coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.name), ''), nullif(trim(p.nickname), ''), 'Guest Hooper'),
  p.nickname,
  p.position,
  p.photo_url,
  coalesce(p.photo_position, 'center center'),
  'Migrated from the legacy mixed players list. Historical stats remain linked to the original record.',
  coalesce(p.is_active, true)
from public.players p
where p.player_type = 'guest_legacy'
  and not exists (
    select 1
    from public.guest_hoopers g
    where lower(trim(g.full_name)) = lower(trim(coalesce(nullif(p.full_name, ''), nullif(p.name, ''), nullif(p.nickname, ''), 'Guest Hooper')))
  );

-- Public and player-account reads can now only expose official FACKTS players.
drop policy if exists "players_read_own_account" on public.players;
create policy "players_read_own_account"
  on public.players
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and is_active = true
    and player_type = 'fackts_player'
  );

drop policy if exists "players_read_active_public" on public.players;
create policy "players_read_active_public"
  on public.players
  for select
  to anon, authenticated
  using (
    is_active = true
    and player_type = 'fackts_player'
  );

commit;
