begin;

-- A former FACKTS player keeps one permanent player identity.  When their
-- category changes, the linked guest row becomes the public guest identity
-- while historical player_game_stats remain safely attached to the original
-- player id.
alter table public.players
  drop constraint if exists players_player_type_check;

alter table public.players
  add constraint players_player_type_check
  check (
    player_type in (
      'fackts_player',
      'external_player',
      'guest_hooper',
      'guest_legacy',
      'prospect'
    )
  );

alter table public.guest_hoopers
  add column if not exists source_player_id uuid references public.players(id) on delete set null,
  add column if not exists guest_type text not null default 'guest_hooper';

alter table public.guest_hoopers
  drop constraint if exists guest_hoopers_guest_type_check;

alter table public.guest_hoopers
  add constraint guest_hoopers_guest_type_check
  check (guest_type in ('guest_hooper', 'external_player'));

create unique index if not exists guest_hoopers_source_player_id_unique
  on public.guest_hoopers(source_player_id);

create index if not exists guest_hoopers_guest_type_active_idx
  on public.guest_hoopers(guest_type, is_active);

comment on column public.guest_hoopers.source_player_id is
  'Permanent link to a former/current players row so career stats follow category changes without copying or deleting match data.';

-- Link guest rows created by the previous classification migration.  The two
-- row numbers make name-based backfill one-to-one; ambiguous duplicates are
-- left alone and receive a new unambiguous linked row below.
with candidates as (
  select
    g.id as guest_id,
    p.id as player_id,
    row_number() over (
      partition by p.id
      order by
        case when coalesce(g.notes, '') like 'Migrated from the legacy mixed players list.%' then 0 else 1 end,
        g.created_at nulls last,
        g.id
    ) as player_rank,
    row_number() over (
      partition by g.id
      order by p.created_at nulls last, p.id
    ) as guest_rank
  from public.players p
  join public.guest_hoopers g
    on lower(trim(g.full_name)) = lower(trim(coalesce(nullif(p.full_name, ''), nullif(p.name, ''), nullif(p.nickname, ''), 'Guest Hooper')))
  where p.player_type in ('external_player', 'guest_hooper', 'guest_legacy')
    and g.source_player_id is null
)
update public.guest_hoopers g
set
  source_player_id = candidates.player_id,
  guest_type = case
    when p.player_type = 'external_player' then 'external_player'
    else 'guest_hooper'
  end
from candidates
join public.players p on p.id = candidates.player_id
where g.id = candidates.guest_id
  and candidates.player_rank = 1
  and candidates.guest_rank = 1;

-- Ensure every already-demoted player has exactly one linked guest identity.
insert into public.guest_hoopers (
  source_player_id,
  guest_type,
  full_name,
  nickname,
  position,
  photo_url,
  photo_position,
  notes,
  is_active
)
select
  p.id,
  case when p.player_type = 'external_player' then 'external_player' else 'guest_hooper' end,
  coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.name), ''), nullif(trim(p.nickname), ''), 'Guest Hooper'),
  p.nickname,
  p.position,
  p.photo_url,
  coalesce(p.photo_position, 'center center'),
  'Linked to the original FACKTS player identity. Career stats follow the current player category.',
  coalesce(p.is_active, true)
from public.players p
where p.player_type in ('external_player', 'guest_hooper', 'guest_legacy')
on conflict (source_player_id) do update
set
  guest_type = excluded.guest_type,
  full_name = excluded.full_name,
  nickname = excluded.nickname,
  position = excluded.position,
  photo_url = excluded.photo_url,
  photo_position = excluded.photo_position,
  is_active = excluded.is_active;

-- A demoted player cannot retain official portal access or featured-player
-- placement.  The Auth user itself is preserved so no account data is deleted.
create or replace function public.enforce_player_category_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.player_type <> 'fackts_player' then
    new.user_id := null;
    new.is_featured := false;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_player_category_access_trigger on public.players;
create trigger enforce_player_category_access_trigger
before insert or update of player_type, user_id, is_featured
on public.players
for each row
execute function public.enforce_player_category_access();

-- Keep the linked guest identity in sync whenever an admin changes the player
-- category or edits public profile fields.
create or replace function public.sync_linked_guest_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.player_type in ('external_player', 'guest_hooper', 'guest_legacy') then
    insert into public.guest_hoopers (
      source_player_id,
      guest_type,
      full_name,
      nickname,
      position,
      photo_url,
      photo_position,
      notes,
      is_active
    )
    values (
      new.id,
      case when new.player_type = 'external_player' then 'external_player' else 'guest_hooper' end,
      coalesce(nullif(trim(new.full_name), ''), nullif(trim(new.name), ''), nullif(trim(new.nickname), ''), 'Guest Hooper'),
      new.nickname,
      new.position,
      new.photo_url,
      coalesce(new.photo_position, 'center center'),
      'Linked to the original FACKTS player identity. Career stats follow the current player category.',
      coalesce(new.is_active, true)
    )
    on conflict (source_player_id) do update
    set
      guest_type = excluded.guest_type,
      full_name = excluded.full_name,
      nickname = excluded.nickname,
      position = excluded.position,
      photo_url = excluded.photo_url,
      photo_position = excluded.photo_position,
      is_active = excluded.is_active;
  else
    update public.guest_hoopers
    set is_active = false
    where source_player_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_linked_guest_identity_trigger on public.players;
create trigger sync_linked_guest_identity_trigger
after insert or update of player_type, full_name, name, nickname, position, photo_url, photo_position, is_active
on public.players
for each row
execute function public.sync_linked_guest_identity();

commit;
