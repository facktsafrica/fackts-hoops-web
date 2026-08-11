-- FACKTS Hoops Admin Rebuild - Phase 1 / M15
-- Adds explicit media subjects and enforces consent before governed media can
-- become public. Existing legacy public reads remain unchanged for Phase 2.

begin;

alter table public.consents
  add column if not exists correction_notes text;

create table if not exists public.media_subjects (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  required_scope text not null default 'all_media',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, player_id)
);

create index if not exists media_subjects_player_idx
  on public.media_subjects(player_id, asset_id);

insert into public.media_subjects (asset_id, player_id, required_scope, metadata)
select
  link.asset_id,
  link.owner_id::uuid,
  case asset.media_type
    when 'image' then 'photo_use'
    when 'video' then 'video_use'
    when 'audio' then 'audio_use'
    else 'all_media'
  end,
  jsonb_build_object('source', 'M15_player_media_link_backfill')
from public.media_links link
join public.media_assets asset on asset.id = link.asset_id
join public.players player
  on link.owner_type = 'player'
 and player.id = public.phase0_try_uuid(link.owner_id)
on conflict (asset_id, player_id) do nothing;

create or replace function public.phase1_media_subject_has_consent(
  p_asset_id uuid,
  p_player_id uuid,
  p_required_scope text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.consents consent
    where consent.player_id = p_player_id
      and consent.consent_status = 'approved'
      and consent.legacy_self_attested = false
      and consent.evidence_reference is not null
      and consent.captured_at is not null
      and (
        p_required_scope = any(consent.consent_scopes)
        or 'all_media' = any(consent.consent_scopes)
      )
      and (consent.effective_from is null or consent.effective_from <= now())
      and (consent.expires_at is null or consent.expires_at > now())
      and consent.withdrawn_at is null
      and (
        consent.event_id is null
        or exists (
          select 1 from public.media_links link
          where link.asset_id = p_asset_id
            and (
              (link.owner_type = 'event' and link.owner_id = consent.event_id)
              or (
                link.owner_type = 'game'
                and exists (
                  select 1 from public.games game
                  where game.id::text = link.owner_id
                    and game.event_id = consent.event_id
                )
              )
            )
        )
      )
  );
$$;

create or replace function public.phase1_governed_media_consent_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  subject_record record;
  subject_count integer := 0;
begin
  if not new.is_public then
    return new;
  end if;

  for subject_record in
    select subject.player_id, subject.required_scope
    from public.media_subjects subject
    where subject.asset_id = new.id
  loop
    subject_count := subject_count + 1;
    if not public.phase1_media_subject_has_consent(
      new.id,
      subject_record.player_id,
      subject_record.required_scope
    ) then
      raise exception 'MEDIA_SUBJECT_CONSENT_REQUIRED'
        using errcode = '23514';
    end if;
  end loop;

  if subject_count = 0
     and new.media_type in ('image','video','audio')
     and coalesce((new.metadata->>'no_identifiable_people_confirmed')::boolean, false) = false then
    raise exception 'MEDIA_SUBJECT_REVIEW_REQUIRED'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists phase1_media_consent_guard on public.media_assets;
create trigger phase1_media_consent_guard
before insert or update on public.media_assets
for each row execute function public.phase1_governed_media_consent_guard();

create or replace function public.phase1_unpublish_media_after_consent_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.consent_status = 'approved'
     and (
       new.consent_status <> 'approved'
       or new.withdrawn_at is not null
       or new.expires_at is distinct from old.expires_at
       or new.consent_scopes is distinct from old.consent_scopes
     ) then
    update public.media_assets asset
    set is_public = false,
        publish_status = case when asset.publish_status = 'published' then 'review' else asset.publish_status end,
        metadata = asset.metadata || jsonb_build_object(
          'consent_recheck_required', true,
          'consent_changed_at', now()
        ),
        updated_at = now()
    where exists (
      select 1 from public.media_subjects subject
      where subject.asset_id = asset.id
        and subject.player_id = new.player_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists phase1_consent_change_unpublishes_media on public.consents;
create trigger phase1_consent_change_unpublishes_media
after update on public.consents
for each row execute function public.phase1_unpublish_media_after_consent_change();

alter table public.media_subjects enable row level security;

drop policy if exists "Consent and media admins read media subjects" on public.media_subjects;
create policy "Consent and media admins read media subjects"
  on public.media_subjects for select to authenticated
  using (public.has_admin_any_permission(array['consents','media','activity'], 'player', player_id::text, false));

drop policy if exists "Media admins manage media subjects" on public.media_subjects;
create policy "Media admins manage media subjects"
  on public.media_subjects for all to authenticated
  using (public.has_admin_permission('media', 'player', player_id::text, true))
  with check (public.has_admin_permission('media', 'player', player_id::text, true));

grant select, insert, update, delete on public.media_subjects to authenticated;

drop trigger if exists phase0_admin_audit_trigger on public.media_subjects;
create trigger phase0_admin_audit_trigger after insert or update or delete on public.media_subjects
for each row execute function public.capture_admin_row_audit('media_subjects', 'media');

comment on table public.media_subjects is
  'Canonical people identifiable in a governed media asset; public media requires current evidence-backed consent for every subject.';

commit;
