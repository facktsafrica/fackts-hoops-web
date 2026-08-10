-- FACKTS Hoops Admin Rebuild - Phase 0 / M09
-- Adds admin-only compatibility views and an evidence report. It does not
-- switch public reads or remove any legacy table, column, route or relation.

begin;

create or replace view public.phase0_participation_compat
with (security_invoker = true)
as
select
  roster.id::text as participation_id,
  roster.game_id::text as game_id,
  roster.player_id,
  roster.participation_role,
  roster.roster_role,
  roster.roster_status,
  roster.team_side,
  roster.jersey_snapshot,
  roster.legacy_guest_roster_id,
  case when roster.legacy_guest_roster_id is null then 'game_rosters' else 'game_guest_rosters' end as source_system,
  roster.created_at,
  roster.updated_at
from public.game_rosters roster;

create or replace view public.phase0_statistics_compat
with (security_invoker = true)
as
select
  stat.id::text as stat_id,
  stat.game_id::text as game_id,
  stat.player_id,
  stat.points,
  stat.rebounds,
  stat.assists,
  stat.steals,
  stat.blocks,
  stat.turnovers,
  stat.fouls,
  stat.three_made,
  stat.three_attempted,
  stat.ft_made,
  stat.ft_attempted,
  stat.team_side,
  stat.entry_status,
  stat.verification_status,
  stat.source_guest_stat_id,
  case when stat.source_guest_stat_id is null then 'player_game_stats' else 'guest_game_stats' end as source_system,
  stat.created_at,
  stat.updated_at
from public.player_game_stats stat;

create or replace view public.phase0_legacy_coverage
with (security_invoker = true)
as
select 'guest_hoopers'::text as legacy_system,
  count(*)::bigint as legacy_rows,
  count(*) filter (where source_player_id is not null)::bigint as mapped_rows,
  count(*) filter (where source_player_id is null)::bigint as review_rows
from public.guest_hoopers
union all
select 'game_guest_rosters',
  count(*)::bigint,
  count(*) filter (where exists (
    select 1 from public.legacy_record_mappings mapping
    where mapping.migration_key = 'M03'
      and mapping.source_table = 'game_guest_rosters'
      and mapping.source_id = game_guest_rosters.id::text
  ))::bigint,
  count(*) filter (where not exists (
    select 1 from public.legacy_record_mappings mapping
    where mapping.migration_key = 'M03'
      and mapping.source_table = 'game_guest_rosters'
      and mapping.source_id = game_guest_rosters.id::text
  ))::bigint
from public.game_guest_rosters
union all
select 'guest_game_stats',
  count(*)::bigint,
  count(*) filter (where exists (
    select 1 from public.legacy_record_mappings mapping
    where mapping.migration_key = 'M04'
      and mapping.source_table = 'guest_game_stats'
      and mapping.source_id = guest_game_stats.id::text
  ))::bigint,
  count(*) filter (where not exists (
    select 1 from public.legacy_record_mappings mapping
    where mapping.migration_key = 'M04'
      and mapping.source_table = 'guest_game_stats'
      and mapping.source_id = guest_game_stats.id::text
  ))::bigint
from public.guest_game_stats
union all
select 'guest_one_on_one_stats',
  count(*)::bigint,
  count(*) filter (where exists (
    select 1 from public.legacy_record_mappings mapping
    where mapping.migration_key = 'M05'
      and mapping.source_table = 'guest_one_on_one_stats'
      and mapping.source_id = guest_one_on_one_stats.id::text
  ))::bigint,
  count(*) filter (where not exists (
    select 1 from public.legacy_record_mappings mapping
    where mapping.migration_key = 'M05'
      and mapping.source_table = 'guest_one_on_one_stats'
      and mapping.source_id = guest_one_on_one_stats.id::text
  ))::bigint
from public.guest_one_on_one_stats;

create or replace function public.phase0_reconciliation_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  report jsonb;
begin
  -- Supabase SQL Editor runs as a trusted database-owner session and has no
  -- auth.uid(). API callers must still be authenticated Admin users.
  if session_user not in ('postgres', 'supabase_admin')
     and not public.has_admin_any_permission(array['audit','activity','reports'], null, null, false) then
    raise exception 'Not authorized to read the Phase 0 reconciliation report'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'public_reads_switched', false,
    'legacy_structures_removed', false,
    'identity', jsonb_build_object(
      'canonical_players', (select count(*) from public.players),
      'legacy_guests', (select count(*) from public.guest_hoopers),
      'mapped_guests', (select count(*) from public.guest_hoopers where source_player_id is not null),
      'unmapped_guests', (select count(*) from public.guest_hoopers where source_player_id is null),
      'aliases', (select count(*) from public.legacy_identity_aliases)
    ),
    'participation', jsonb_build_object(
      'canonical_rows', (select count(*) from public.game_rosters),
      'legacy_guest_rows', (select count(*) from public.game_guest_rosters),
      'legacy_mapped_rows', (
        select count(*) from public.legacy_record_mappings
        where migration_key = 'M03' and source_table = 'game_guest_rosters'
      ),
      'canonical_duplicates', (
        select count(*) from (
          select game_id, player_id from public.game_rosters
          group by game_id, player_id having count(*) > 1
        ) duplicate_rows
      )
    ),
    'statistics', jsonb_build_object(
      'canonical_rows', (select count(*) from public.player_game_stats),
      'legacy_guest_rows', (select count(*) from public.guest_game_stats),
      'legacy_mapped_rows', (
        select count(*) from public.legacy_record_mappings
        where migration_key = 'M04' and source_table = 'guest_game_stats'
      ),
      'canonical_duplicates', (
        select count(*) from (
          select game_id, player_id from public.player_game_stats
          group by game_id, player_id having count(*) > 1
        ) duplicate_rows
      )
    ),
    'one_on_one', jsonb_build_object(
      'legacy_rows', (select count(*) from public.guest_one_on_one_stats),
      'mapped_games', (
        select count(*) from public.legacy_record_mappings
        where migration_key = 'M05' and source_table = 'guest_one_on_one_stats' and target_table = 'games'
      )
    ),
    'media', jsonb_build_object(
      'assets', (select count(*) from public.media_assets),
      'links', (select count(*) from public.media_links),
      'public_approved_assets', (
        select count(*) from public.media_assets
        where is_public and publish_status = 'published' and rights_status = 'approved'
      ),
      'needs_review', (select count(*) from public.media_assets where conflict_status <> 'clear')
    ),
    'event_operations', jsonb_build_object(
      'events', (select count(*) from public.event_case_studies),
      'entries', (select count(*) from public.event_entries),
      'setup_needing_review', (
        select count(*) from public.event_setup_progress where validation_status <> 'valid'
      ),
      'deliverables', (select count(*) from public.event_deliverables)
    ),
    'governance', jsonb_build_object(
      'consents', (select count(*) from public.consents),
      'approved_consents', (select count(*) from public.consents where consent_status = 'approved'),
      'legacy_self_attested_consents', (select count(*) from public.consents where legacy_self_attested),
      'open_corrections', (
        select count(*) from public.correction_requests
        where correction_status in ('open','triaged','in_progress')
      )
    ),
    'review_issues', jsonb_build_object(
      'open', (select count(*) from public.migration_review_issues where status = 'open'),
      'blocking', (
        select count(*) from public.migration_review_issues
        where status = 'open' and severity = 'blocking'
      )
    )
  ) into report;

  return report;
end;
$$;

revoke all on public.phase0_participation_compat from anon, public;
revoke all on public.phase0_statistics_compat from anon, public;
revoke all on public.phase0_legacy_coverage from anon, public;
grant select on public.phase0_participation_compat,
  public.phase0_statistics_compat,
  public.phase0_legacy_coverage to authenticated;

revoke all on function public.phase0_reconciliation_report() from public, anon, authenticated;
grant execute on function public.phase0_reconciliation_report() to authenticated;

comment on view public.phase0_participation_compat is
  'Admin compatibility projection over canonical game_rosters; not used by public Phase 0 reads.';
comment on view public.phase0_statistics_compat is
  'Admin compatibility projection over canonical player_game_stats; not used by public Phase 0 reads.';
comment on view public.phase0_legacy_coverage is
  'Admin parity counts showing mapped and review-required legacy rows.';

comment on table public.game_guest_rosters is
  'Legacy participation compatibility table retained through the Phase 0 rollback window.';
comment on table public.guest_game_stats is
  'Legacy guest statistic compatibility table retained through the Phase 0 rollback window.';
comment on table public.guest_hoopers is
  'Legacy guest-facing identity and URL compatibility table retained through the Phase 0 rollback window.';
comment on table public.media_stories is
  'Legacy media story table retained; media_assets/media_links are additive and public reads are not switched in Phase 0.';

commit;
