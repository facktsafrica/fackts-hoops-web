# Phase 0 M00 live baseline review

The production snapshot captured at `2026-08-10T21:00:25.501339+00:00` was reviewed before approving the additive Phase 0 migrations.

## Gate result

- All snapshot row-count queries completed without errors.
- All inspected public application tables have row-level security enabled.
- No orphaned official roster, Guest roster, official statistic, or Guest statistic foreign-key relationships were found.
- No duplicate `(game_id, player_id)` rows were found in `game_rosters` or `player_game_stats`.
- Twelve legacy Guest profiles exist. Nine already have a canonical Player link; three have no link and must receive separate canonical Player records in M02.
- Eight possible duplicate-name groups were observed across legacy Guest and Player profiles. They are review evidence only. No migration is permitted to merge people by name.
- The live schema stores the legacy 1v1 Player reference columns as `text`, while canonical Player and Guest IDs are `uuid`.

## Core row baseline

| System | Rows |
|---|---:|
| Players | 23 |
| Guest profiles | 12 |
| Games | 8 |
| Official rosters | 6 |
| Guest rosters | 1 |
| Official game statistics | 58 |
| Guest game statistics | 1 |
| Legacy Guest 1v1 statistics | 13 |
| Canonical 1v1 games | 3 |
| Media stories | 7 |
| Event case studies | 1 |
| Event records | 86 |
| Admin profiles | 2 |

## Corrections made from the live evidence

- M00 and M02 now lowercase identity names before removing non-alphanumeric characters, preserving uppercase initials during normalization.
- M05 now validates and safely converts legacy text identifiers to UUIDs. Invalid or external identifiers become blocking review issues instead of aborting the migration or being matched by name.
- M01 now aborts transactionally before restrictive policies are installed if no active administrator maps to the capability model.
- M09 reconciliation can run from the trusted Supabase SQL Editor owner session while API callers remain permission-gated.

## Approval boundary

The baseline is suitable for M01-M09 after the corrections above. This approval covers Phase 0 only. Public reads remain on their existing sources, legacy tables remain present, and any open blocking reconciliation issue prevents later cutover.
