begin;

-- Promote a guest in one database transaction. This prevents half-promoted
-- people (official row created while the guest row remains active) and makes
-- repeated clicks safe.
create or replace function public.promote_guest_to_official_player(p_guest_id uuid)
returns table(player_id uuid, player_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guest_hoopers%rowtype;
  v_player_id uuid;
  v_name text;
begin
  select *
  into v_guest
  from public.guest_hoopers
  where id = p_guest_id
  for update;

  if not found then
    raise exception 'Guest hooper not found.';
  end if;

  v_name := coalesce(nullif(trim(v_guest.full_name), ''), nullif(trim(v_guest.nickname), ''), 'FACKTS Player');
  v_player_id := v_guest.source_player_id;

  if v_player_id is not null then
    update public.players
    set
      full_name = v_name,
      name = v_name,
      nickname = v_guest.nickname,
      position = v_guest.position,
      photo_url = coalesce(v_guest.photo_url, photo_url),
      photo_position = coalesce(nullif(v_guest.photo_position, ''), photo_position, 'center center'),
      bio = coalesce(v_guest.notes, bio),
      role = 'Player',
      player_type = 'fackts_player',
      is_active = true,
      updated_at = now()
    where id = v_player_id;

    if not found then
      v_player_id := null;
    end if;
  end if;

  if v_player_id is null then
    -- Repair/reuse an earlier half-promotion before creating another person.
    select p.id
    into v_player_id
    from public.players p
    where lower(trim(coalesce(nullif(p.full_name, ''), nullif(p.name, ''), nullif(p.nickname, '')))) = lower(trim(v_name))
    order by
      case when p.player_type = 'fackts_player' then 0 else 1 end,
      p.created_at asc nulls last,
      p.id
    limit 1
    for update;

    if v_player_id is not null then
      update public.players
      set
        full_name = v_name,
        name = v_name,
        nickname = coalesce(v_guest.nickname, nickname),
        position = coalesce(v_guest.position, position),
        photo_url = coalesce(v_guest.photo_url, photo_url),
        photo_position = coalesce(nullif(v_guest.photo_position, ''), photo_position, 'center center'),
        bio = coalesce(v_guest.notes, bio),
        role = 'Player',
        player_type = 'fackts_player',
        is_active = true,
        updated_at = now()
      where id = v_player_id;
    else
      insert into public.players (
        full_name, name, nickname, position, photo_url, photo_position,
        bio, role, player_type, is_active, created_at, updated_at
      ) values (
        v_name, v_name, v_guest.nickname, v_guest.position, v_guest.photo_url,
        coalesce(nullif(v_guest.photo_position, ''), 'center center'),
        v_guest.notes, 'Player', 'fackts_player', true, now(), now()
      )
      returning id into v_player_id;
    end if;
  end if;

  update public.guest_hoopers
  set source_player_id = v_player_id, is_active = false
  where id = p_guest_id;

  return query select v_player_id, v_name;
end;
$$;

revoke all on function public.promote_guest_to_official_player(uuid) from public, anon, authenticated;
grant execute on function public.promote_guest_to_official_player(uuid) to service_role;

-- Repair historical half-promotions: an inactive/active guest linked to an
-- official player must never remain visible in the guest directory.
update public.guest_hoopers g
set is_active = false
from public.players p
where g.source_player_id = p.id
  and p.player_type = 'fackts_player'
  and p.is_active = true
  and g.is_active = true;

commit;
