import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const migrations = Array.from({ length: 9 }, (_, index) =>
  `supabase/migrations/20260810_00${index + 1}_phase0_${[
    "admin_security_audit",
    "canonical_identity",
    "participation",
    "shared_statistics",
    "one_on_one_mapping",
    "unified_media",
    "event_operations",
    "consent_and_corrections",
    "compatibility_and_reconciliation",
  ][index]}.sql`
);

const requiredFiles = [
  "supabase/phase0/M00_live_schema_and_data_snapshot.sql",
  ...migrations,
  "supabase/phase0/M09_post_migration_reconciliation.sql",
  "docs/phase0/README.md",
  "lib/admin/audit.ts",
  "lib/admin/phase0.ts",
  "lib/admin/validation.ts",
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

const m00 = sources.get(requiredFiles[0]) ?? "";
if (/transaction\s+read\s+only/i.test(m00)) {
  failures.push("M00 cannot use an explicitly read-only transaction because it creates a temporary snapshot table");
}
if (!/create\s+temporary\s+table\s+phase0_snapshot_counts/i.test(m00)) {
  failures.push("M00 temporary snapshot table is missing");
}
if (!/\brollback\s*;/i.test(m00)) failures.push("M00 does not end with rollback");
if (/lower\(regexp_replace\(trim\(coalesce/i.test(m00)) {
  failures.push("M00 normalizes identity names before lowercasing and can strip uppercase initials");
}

const destructivePatterns = [
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\balter\s+table[\s\S]{0,160}\bdrop\s+column\b/i,
];
const forbiddenDuplicateCreates = [
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.players\b/i,
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.guest_hoopers\b/i,
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.player_game_stats\b/i,
  /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.media_stories\b/i,
];

for (const migration of migrations) {
  const source = sources.get(migration) ?? "";
  if (!/^\s*--[\s\S]*?\bbegin\s*;/i.test(source)) failures.push(`${migration} does not start a transaction`);
  if (!/\bcommit\s*;\s*$/i.test(source)) failures.push(`${migration} does not end with commit`);
  for (const pattern of destructivePatterns) {
    if (pattern.test(source)) failures.push(`${migration} contains forbidden destructive SQL: ${pattern}`);
  }
  for (const pattern of forbiddenDuplicateCreates) {
    if (pattern.test(source)) failures.push(`${migration} creates a duplicate legacy/canonical system`);
  }
}

const canonicalIdentity = sources.get(migrations[1]) ?? "";
if (/lower\(regexp_replace\(/i.test(canonicalIdentity)) {
  failures.push("M02 normalizes identity names before lowercasing and can strip uppercase initials");
}

const oneOnOneMapping = sources.get(migrations[4]) ?? "";
if (!/create\s+or\s+replace\s+function\s+public\.phase0_try_uuid\s*\(p_value\s+text\)/i.test(oneOnOneMapping)) {
  failures.push("M05 is missing safe text-to-UUID conversion for live 1v1 reference columns");
}
if (/p\.id\s*=\s*legacy\.(?:fackts_player_id|opponent_player_id)/i.test(oneOnOneMapping)
    || /g\.id\s*=\s*legacy\.opponent_guest_hooper_id/i.test(oneOnOneMapping)) {
  failures.push("M05 compares live text references directly with UUID columns");
}

const protectedRoutes = [
  ["app/api/games/route.ts", "getAdminCapabilityAccess(\"games\")"],
  ["app/api/players/route.ts", "getAdminCapabilityAccess(\"players\")"],
  ["app/api/stats/route.ts", "getAdminCapabilityAccess(\"stats\")"],
  ["app/api/admin/events/route.ts", "getAdminCapabilityAccess(\"calendar\")"],
];
for (const [relativePath, marker] of protectedRoutes) {
  const source = await readFile(path.join(root, relativePath), "utf8");
  if (!source.includes(marker)) failures.push(`${relativePath} is missing its server capability check`);
}

if (failures.length) {
  console.error("Phase 0 validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Phase 0 validation passed (${requiredFiles.length} required artifacts, 9 additive migrations).`);
}
