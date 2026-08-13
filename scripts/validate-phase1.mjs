import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const migrations = [
  "supabase/migrations/20260811_009_phase1_permission_presets.sql",
  "supabase/migrations/20260811_010_phase1_canonical_people.sql",
  "supabase/migrations/20260811_011_phase1_event_setup_idempotency.sql",
  "supabase/migrations/20260811_012_phase1_game_operations.sql",
  "supabase/migrations/20260811_013_phase1_roster_import.sql",
  "supabase/migrations/20260811_014_phase1_statistics_workflow.sql",
  "supabase/migrations/20260811_015_phase1_consent_media_guard.sql",
  "supabase/migrations/20260811_016_phase1_corrections_workflow.sql",
];

const protectedRoutes = [
  "app/api/admin/users/route.ts",
  "app/api/admin/people/route.ts",
  "app/api/admin/events/route.ts",
  "app/api/admin/events/setup/route.ts",
  "app/api/admin/games/route.ts",
  "app/api/admin/rosters/route.ts",
  "app/api/admin/stats/route.ts",
  "app/api/admin/media/route.ts",
  "app/api/admin/consents/route.ts",
  "app/api/admin/corrections/route.ts",
  "app/api/admin/reports/route.ts",
];

const requiredFiles = [
  ...migrations,
  ...protectedRoutes,
  "app/admin/events/[eventId]/setup/EventSetupWizard.tsx",
  "app/admin/reports/page.tsx",
  "app/admin/media/page.tsx",
  "app/admin/page.tsx",
  "lib/admin/dashboard.ts",
  "lib/admin/permissions.ts",
  "lib/admin/rosterFileParser.ts",
];

const failures = [];
const sources = new Map();

for (const relativePath of requiredFiles) {
  try {
    const details = await stat(path.join(root, relativePath));
    if (!details.isFile() || details.size === 0) failures.push(`${relativePath} is empty or not a file`);
    const source = await readFile(path.join(root, relativePath), "utf8");
    sources.set(relativePath, source);
    if (source.includes("\u0000")) failures.push(`${relativePath} contains NUL bytes`);
    if (source.charCodeAt(0) === 0xfeff) failures.push(`${relativePath} has a UTF-8 BOM`);
  } catch {
    failures.push(`${relativePath} is missing`);
  }
}

const destructivePatterns = [
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\balter\s+table[\s\S]{0,160}\bdrop\s+column\b/i,
];
const duplicateSystemPatterns = [
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.players\b/i,
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.guest_hoopers\b/i,
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.player_game_stats\b/i,
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.games\b/i,
];

for (const migration of migrations) {
  const source = sources.get(migration) ?? "";
  if (!/^\s*--[\s\S]*?\bbegin\s*;/i.test(source)) failures.push(`${migration} does not start a transaction`);
  if (!/\bcommit\s*;\s*$/i.test(source)) failures.push(`${migration} does not end with commit`);
  for (const pattern of destructivePatterns) {
    if (pattern.test(source)) failures.push(`${migration} contains destructive SQL: ${pattern}`);
  }
  for (const pattern of duplicateSystemPatterns) {
    if (pattern.test(source)) failures.push(`${migration} creates a duplicate canonical system`);
  }
}

const expectedMigrationMarkers = [
  [migrations[0], "read_only_partner"],
  [migrations[1], "phase1_ensure_canonical_player_alias"],
  [migrations[2], "setup_key"],
  [migrations[3], "phase1_bump_game_version"],
  [migrations[4], "phase1_commit_roster_import"],
  [migrations[5], "period_values"],
  [migrations[6], "phase1_governed_media_consent_guard"],
  [migrations[7], "phase1_apply_correction"],
];
for (const [migration, marker] of expectedMigrationMarkers) {
  if (!(sources.get(migration) ?? "").includes(marker)) failures.push(`${migration} is missing ${marker}`);
}

const rosterMigration = sources.get(migrations[4]) ?? "";
if (!/security\s+definer/i.test(rosterMigration) || !/revoke\s+all\s+on\s+function\s+public\.phase1_commit_roster_import/i.test(rosterMigration)) {
  failures.push("Roster commit RPC is not both transactional and service-role restricted");
}
const correctionMigration = sources.get(migrations[7]) ?? "";
if (!/for\s+update/i.test(correctionMigration) || !/previous_value/i.test(correctionMigration)) {
  failures.push("Correction application is missing its locked stale-value guard");
}
const consentMigration = sources.get(migrations[6]) ?? "";
if (!/phase1_media_subject_has_consent/i.test(consentMigration) || !/media_subjects/i.test(consentMigration)) {
  failures.push("Media publication is not connected to evidence-backed consent subjects");
}

for (const route of protectedRoutes) {
  const source = sources.get(route) ?? "";
  if (!source.includes("getAdminAccess") && !source.includes("getAdminCapabilityAccess")) {
    failures.push(`${route} is missing its authenticated Admin boundary`);
  }
  if (!source.includes("canAdmin") && !source.includes("getAdminCapabilityAccess")) {
    failures.push(`${route} is missing its server capability check`);
  }
}

const wizard = sources.get("app/admin/events/[eventId]/setup/EventSetupWizard.tsx") ?? "";
for (const stage of ["Organizer and Event", "Competition Format", "Teams / Participants", "Schedule", "Services", "Branding", "Publish"]) {
  if (!wizard.includes(stage)) failures.push(`Event wizard is missing stage: ${stage}`);
}
const parser = sources.get("lib/admin/rosterFileParser.ts") ?? "";
if (!parser.includes("parseXlsx") || !parser.includes("parseDelimited")) failures.push("Roster parser does not cover both Excel and delimited files");
const reports = sources.get("app/admin/reports/page.tsx") ?? "";
for (const report of ["event_completion", "participation", "statistics", "media_delivery", "sponsor_summary"]) {
  if (!reports.includes(report)) failures.push(`Reports UI is missing ${report}`);
}
const dashboard = sources.get("lib/admin/dashboard.ts") ?? "";
for (const metric of ["Active events", "Today's games", "Pending rosters", "Unverified statistics", "Media awaiting links", "Overdue deliveries", "Data errors"]) {
  if (!dashboard.includes(metric)) failures.push(`Admin Home is missing live metric: ${metric}`);
}
for (const marker of ["What happens next", "Competition pulse", "Operational readiness"]) {
  const adminHome = sources.get("app/admin/page.tsx") ?? "";
  if (!adminHome.includes(marker)) failures.push(`FACKTS Intelligence Centre is missing: ${marker}`);
}
const mediaPage = sources.get("app/admin/media/page.tsx") ?? "";
for (const marker of ["Media Intelligence Centre", "rights_status", "publish_status", "game_id", "event_id"]) {
  if (!mediaPage.includes(marker)) failures.push(`Media Centre is missing: ${marker}`);
}

if (failures.length) {
  console.error("Phase 1 validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Phase 1 validation passed (${requiredFiles.length} required artifacts, ${migrations.length} additive migrations, ${protectedRoutes.length} protected Admin routes).`);
}
