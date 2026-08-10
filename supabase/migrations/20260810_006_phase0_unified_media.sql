-- FACKTS Hoops Admin Rebuild - Phase 0 / M06
-- Adds a single governed media catalogue and links existing media records to it.
-- Legacy media tables and all current public reads remain unchanged.

begin;

create or replace function public.phase0_normalize_media_url(p_url text)
returns text
language sql
immutable
parallel safe
as $$
  select regexp_replace(
    regexp_replace(lower(trim(coalesce(p_url, ''))), '^http://', 'https://'),
    '/+$',
    ''
  );
$$;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  url text not null check (length(trim(url)) > 0),
  normalized_url text generated always as (public.phase0_normalize_media_url(url)) stored,
  url_fingerprint text generated always as (md5(public.phase0_normalize_media_url(url))) stored,
  dedupe_key text generated always as (
    md5(public.phase0_normalize_media_url(url) || '|' || rights_status || '|' || is_public::text)
  ) stored unique,
  media_type text not null default 'link'
    check (media_type in ('image','video','audio','document','embed','link','other')),
  title text,
  thumbnail_url text,
  platform text,
  rights_status text not null default 'unknown'
    check (rights_status in ('unknown','pending','approved','restricted','expired','withdrawn')),
  publish_status text not null default 'draft'
    check (publish_status in ('draft','review','published','archived')),
  is_public boolean not null default false,
  health_status text not null default 'unchecked'
    check (health_status in ('unchecked','healthy','warning','broken')),
  conflict_status text not null default 'clear'
    check (conflict_status in ('clear','needs_review','conflicting_rights','duplicate_candidate')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_profiles(id) on delete set null,
  updated_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_public or (rights_status = 'approved' and publish_status = 'published'))
);

create table if not exists public.media_links (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  owner_type text not null
    check (owner_type in ('event','game','team','player','story','one_on_one','legacy')),
  owner_id text not null check (length(trim(owner_id)) > 0),
  link_role text not null default 'attachment',
  display_order integer not null default 0 check (display_order >= 0),
  legacy_source_table text,
  legacy_source_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, owner_type, owner_id, link_role)
);

create unique index if not exists media_links_legacy_source_unique
  on public.media_links(legacy_source_table, legacy_source_id, owner_type, owner_id, link_role)
  where legacy_source_table is not null and legacy_source_id is not null;

create index if not exists media_assets_url_fingerprint_idx
  on public.media_assets(url_fingerprint);
create index if not exists media_assets_publish_idx
  on public.media_assets(is_public, publish_status, rights_status);
create index if not exists media_links_owner_idx
  on public.media_links(owner_type, owner_id, display_order);

create or replace function public.phase0_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists media_assets_touch_updated_at on public.media_assets;
create trigger media_assets_touch_updated_at
before update on public.media_assets
for each row execute function public.phase0_touch_updated_at();

drop trigger if exists media_links_touch_updated_at on public.media_links;
create trigger media_links_touch_updated_at
before update on public.media_links
for each row execute function public.phase0_touch_updated_at();

create or replace function public.phase0_capture_media(
  p_source_table text,
  p_source_id text,
  p_url text,
  p_media_type text,
  p_title text,
  p_thumbnail_url text,
  p_owner_type text,
  p_owner_id text,
  p_link_role text,
  p_rights_status text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  captured_asset_id uuid;
  safe_media_type text;
  safe_owner_type text;
  safe_rights_status text;
begin
  if nullif(trim(p_url), '') is null
     or nullif(trim(p_source_table), '') is null
     or nullif(trim(p_source_id), '') is null
     or nullif(trim(p_owner_id), '') is null then
    return null;
  end if;

  safe_media_type := case when p_media_type in ('image','video','audio','document','embed','link','other')
    then p_media_type else 'link' end;
  safe_owner_type := case when p_owner_type in ('event','game','team','player','story','one_on_one','legacy')
    then p_owner_type else 'legacy' end;
  safe_rights_status := case when p_rights_status in ('unknown','pending','approved','restricted','expired','withdrawn')
    then p_rights_status else 'unknown' end;

  insert into public.media_assets (
    url, media_type, title, thumbnail_url, rights_status,
    publish_status, is_public, conflict_status, metadata
  ) values (
    trim(p_url), safe_media_type, nullif(trim(p_title), ''), nullif(trim(p_thumbnail_url), ''),
    safe_rights_status, 'draft', false, 'needs_review',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'legacy_source_table', p_source_table,
      'legacy_public_state_preserved_only_in_source', true
    )
  )
  on conflict (dedupe_key) do update
  set metadata = public.media_assets.metadata || excluded.metadata,
      updated_at = now()
  returning id into captured_asset_id;

  insert into public.media_links (
    asset_id, owner_type, owner_id, link_role,
    legacy_source_table, legacy_source_id, metadata
  ) values (
    captured_asset_id, safe_owner_type, trim(p_owner_id), coalesce(nullif(trim(p_link_role), ''), 'attachment'),
    trim(p_source_table), trim(p_source_id), coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (asset_id, owner_type, owner_id, link_role) do update
  set legacy_source_table = coalesce(public.media_links.legacy_source_table, excluded.legacy_source_table),
      legacy_source_id = coalesce(public.media_links.legacy_source_id, excluded.legacy_source_id),
      metadata = public.media_links.metadata || excluded.metadata,
      updated_at = now();

  return captured_asset_id;
end;
$$;

revoke all on function public.phase0_capture_media(text,text,text,text,text,text,text,text,text,text,jsonb) from public;

do $$
declare
  source_table text;
  source_record record;
  payload jsonb;
  source_id text;
  source_url text;
  owner_type text;
  owner_id text;
  media_type text;
begin
  foreach source_table in array array[
    'media_stories', 'game_media', 'player_media', 'team_media', 'event_records'
  ] loop
    if to_regclass('public.' || source_table) is null then
      continue;
    end if;

    for source_record in execute format('select to_jsonb(t) as payload from public.%I t', source_table)
    loop
      payload := source_record.payload;
      source_id := coalesce(payload->>'id', payload->>'event_id', md5(payload::text));
      source_url := coalesce(
        nullif(payload->>'youtube_url', ''),
        nullif(payload->>'video_url', ''),
        nullif(payload->>'media_url', ''),
        nullif(payload->>'image_url', ''),
        nullif(payload->>'url', '')
      );

      owner_type := case source_table
        when 'media_stories' then 'story'
        when 'game_media' then 'game'
        when 'player_media' then case when nullif(payload->>'player_id', '') is not null then 'player' else 'legacy' end
        when 'team_media' then 'team'
        when 'event_records' then 'event'
        else 'legacy'
      end;
      owner_id := case source_table
        when 'media_stories' then source_id
        when 'game_media' then coalesce(nullif(payload->>'game_id', ''), source_id)
        when 'player_media' then coalesce(nullif(payload->>'player_id', ''), source_id)
        when 'team_media' then coalesce(nullif(payload->>'team_id', ''), source_id)
        when 'event_records' then coalesce(nullif(payload->>'event_id', ''), source_id)
        else source_id
      end;

      if source_table = 'player_media'
         and nullif(payload->>'player_id', '') is null
         and nullif(payload->>'guest_hooper_id', '') is not null then
        select guest.source_player_id::text into owner_id
        from public.guest_hoopers guest
        where guest.id::text = payload->>'guest_hooper_id';

        if owner_id is not null then
          owner_type := 'player';
        else
          owner_type := 'legacy';
          owner_id := source_id;
          insert into public.migration_review_issues (
            issue_key, issue_type, source_table, source_id, target_table,
            severity, summary, details
          ) values (
            'M06:unmapped_player_media:' || source_id,
            'unmapped_player_media_owner',
            'player_media',
            source_id,
            'media_links',
            'blocking',
            'Player media references a Guest without a valid canonical player. The asset remains linked to its legacy record.',
            jsonb_build_object('guest_hooper_id', payload->>'guest_hooper_id')
          )
          on conflict (issue_key) do update
          set details = excluded.details, status = 'open', updated_at = now();
        end if;
      end if;
      media_type := case
        when coalesce(payload->>'media_type', payload->>'type', '') in ('image','video','audio','document','embed','link','other')
          then coalesce(payload->>'media_type', payload->>'type')
        when source_url ~* '\\.(png|jpe?g|webp|gif|avif)(\\?|$)' then 'image'
        when source_url ~* '(youtube|youtu\\.be|vimeo|\\.(mp4|webm)(\\?|$))' then 'video'
        else 'link'
      end;

      perform public.phase0_capture_media(
        source_table,
        source_id,
        source_url,
        media_type,
        coalesce(payload->>'title', payload->>'name', payload->>'caption'),
        coalesce(payload->>'thumbnail_url', payload->>'poster_url'),
        owner_type,
        owner_id,
        coalesce(payload->>'link_role', payload->>'category', 'attachment'),
        coalesce(payload->>'rights_status', 'unknown'),
        jsonb_build_object(
          'legacy_payload', payload,
          'legacy_is_public', lower(coalesce(payload->>'is_public', 'false')) in ('true','t','1','yes'),
          'legacy_publish_status', payload->>'publish_status'
        )
      );
    end loop;
  end loop;

  if to_regclass('public.guest_one_on_one_stats') is not null then
    for source_record in select to_jsonb(t) as payload from public.guest_one_on_one_stats t
    loop
      payload := source_record.payload;
      source_id := payload->>'id';
      perform public.phase0_capture_media(
        'guest_one_on_one_stats', source_id,
        coalesce(nullif(payload->>'video_url', ''), nullif(payload->>'highlight_url', '')),
        'video', coalesce(payload->>'match_title', '1v1 match'), payload->>'poster_url',
        'one_on_one', source_id, 'highlight', 'unknown', jsonb_build_object('legacy_payload', payload)
      );
      perform public.phase0_capture_media(
        'guest_one_on_one_stats', source_id || ':poster', payload->>'poster_url',
        'image', coalesce(payload->>'match_title', '1v1 match'), null,
        'one_on_one', source_id, 'poster', 'unknown', jsonb_build_object('legacy_payload', payload)
      );
    end loop;
  end if;
end;
$$;

alter table public.media_assets enable row level security;
alter table public.media_links enable row level security;

drop policy if exists "Approved public media assets are readable" on public.media_assets;
create policy "Approved public media assets are readable"
  on public.media_assets for select to anon, authenticated
  using (is_public and publish_status = 'published' and rights_status = 'approved');

drop policy if exists "Media admins read all assets" on public.media_assets;
create policy "Media admins read all assets"
  on public.media_assets for select to authenticated
  using (public.has_admin_any_permission(array['media','activity'], null, null, false));

drop policy if exists "Media admins manage assets" on public.media_assets;
create policy "Media admins manage assets"
  on public.media_assets for all to authenticated
  using (public.has_admin_permission('media'))
  with check (public.has_admin_permission('media'));

drop policy if exists "Public media links are readable" on public.media_links;
create policy "Public media links are readable"
  on public.media_links for select to anon, authenticated
  using (exists (
    select 1 from public.media_assets asset
    where asset.id = asset_id
      and asset.is_public
      and asset.publish_status = 'published'
      and asset.rights_status = 'approved'
  ));

drop policy if exists "Media admins read all links" on public.media_links;
create policy "Media admins read all links"
  on public.media_links for select to authenticated
  using (public.has_admin_any_permission(array['media','activity'], null, null, false));

drop policy if exists "Media admins manage links" on public.media_links;
create policy "Media admins manage links"
  on public.media_links for all to authenticated
  using (public.has_admin_permission('media'))
  with check (public.has_admin_permission('media'));

grant select on public.media_assets, public.media_links to anon, authenticated;
grant insert, update, delete on public.media_assets, public.media_links to authenticated;

drop trigger if exists phase0_admin_audit_trigger on public.media_assets;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.media_assets
for each row execute function public.capture_admin_row_audit('media_assets', 'media');
drop trigger if exists phase0_admin_audit_trigger on public.media_links;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.media_links
for each row execute function public.capture_admin_row_audit('media_links', 'media');

comment on table public.media_assets is
  'Canonical governed media catalogue. Phase 0 imports are private drafts until rights and publication are reviewed.';
comment on table public.media_links is
  'Polymorphic links from one canonical asset to existing domain records; legacy source keys preserve traceability.';

commit;
