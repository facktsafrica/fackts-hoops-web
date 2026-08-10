-- Run after M01-M09 in Supabase SQL Editor. The database-owner SQL Editor
-- session is accepted; API callers still require authenticated Admin audit,
-- activity or reports permission. Save the JSON result with the M00 snapshot
-- before approving any later public-read or write cutover.

select jsonb_pretty(public.phase0_reconciliation_report()) as phase0_reconciliation_report;

select *
from public.phase0_legacy_coverage
order by legacy_system;

select issue_key, issue_type, source_table, source_id, target_table,
  target_id, severity, status, summary, details, created_at, updated_at
from public.migration_review_issues
where status = 'open'
order by
  case severity when 'blocking' then 0 when 'warning' then 1 else 2 end,
  issue_type,
  source_table,
  source_id;

select
  count(*) filter (where legacy_self_attested) as legacy_self_attested_consents,
  count(*) filter (where legacy_self_attested and consent_status = 'approved') as invalid_automatic_approvals
from public.consents;

select
  count(*) filter (where conflict_status <> 'clear') as media_needing_review,
  count(*) filter (where is_public) as public_media_assets,
  count(*) filter (where is_public and not (rights_status = 'approved' and publish_status = 'published'))
    as invalid_public_media_assets
from public.media_assets;
