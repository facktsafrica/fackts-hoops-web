# Phase 0 foundation runbook

This release contains only the approved additive foundation for later P0 Admin modules. It does not introduce the Phase 1 Admin shell or module UI, switch public reads, delete legacy data, or create replacement Player, Guest, Statistics, or Media systems.

## Mandatory production gate

1. Deploy or copy the code and SQL files without running a migration automatically.
2. In the target Supabase project, run `supabase/phase0/M00_live_schema_and_data_snapshot.sql` in SQL Editor.
3. Save its JSON output and compare it with the audited schema assumptions. Resolve any missing tables, unexpected column types, broken relationships, duplicate game/person rows, or orphan records before continuing.
4. Only after that review, run M01 through M09 individually and in filename order. Each migration is transactional, additive, and repeat-safe for the approved schema baseline. Stop immediately if any migration fails; do not skip ahead.
5. Run `supabase/phase0/M09_post_migration_reconciliation.sql` in Supabase SQL Editor. API callers require authenticated audit, activity, or reports access; the trusted SQL Editor owner session is also accepted. Save the result beside M00.
6. Do not approve a later read or write cutover while the report contains unresolved blocking issues.

## Migration order

| Step | File | Purpose |
|---|---|---|
| M00 | `supabase/phase0/M00_live_schema_and_data_snapshot.sql` | Non-persistent live schema/data snapshot and preflight gate; uses only a temporary scratch table and rolls back |
| M01 | `20260810_001_phase0_admin_security_audit.sql` | Role presets, scoped assignments, server/RLS authorization, immutable audit |
| M02 | `20260810_002_phase0_canonical_identity.sql` | Canonical Player aliases, evidence-backed Guest links, review queue |
| M03 | `20260810_003_phase0_participation.sql` | Additive Guest participation mapping into `game_rosters` and import staging |
| M04 | `20260810_004_phase0_shared_statistics.sql` | Shared stat fields and evidence-backed Guest stat mapping into `player_game_stats` |
| M05 | `20260810_005_phase0_one_on_one_mapping.sql` | Evidence-backed 1v1 mapping into existing games, rosters, and stats |
| M06 | `20260810_006_phase0_unified_media.sql` | Private, rights-gated canonical media catalogue and polymorphic links |
| M07 | `20260810_007_phase0_event_operations.sql` | Entries, setup validation state, and deliverables under `event_case_studies` |
| M08 | `20260810_008_phase0_consent_and_corrections.sql` | Private consent evidence and correction workflow foundations |
| M09 | `20260810_009_phase0_compatibility_and_reconciliation.sql` | Admin-only compatibility projections and parity report |

## Compatibility and rollback

- Existing tables, columns, foreign-key relationships, URLs, and public query paths remain in place.
- Existing Guest rows are linked to canonical `players`; no name-only automatic merge is permitted.
- Existing Guest roster/stat rows remain writable during the rollback window. Canonical copies carry legacy source IDs and mapping evidence.
- Historical media imports are private drafts with unknown rights until reviewed. Existing media pages keep reading their legacy sources.
- Historical consent labels become pending/restricted governed records and are marked self-attested. They can never become an approved release automatically.
- Application rollback is performed by returning to the previous application commit while leaving the additive schema in place. Do not drop Phase 0 structures during the production rollback window.
- If M01 permission RPCs have not been applied yet, server routes retain the prior TypeScript capability behavior. After M01, the database becomes the final authorization decision.

## Local validation

Run:

```bash
npm run phase0:validate
npm run lint
npm run typecheck
npm run build
```

This repository does not define an additional automated test command. A live migration execution is intentionally excluded from local validation because M00 must be captured and reviewed against the production database first.
