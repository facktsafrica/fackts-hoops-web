import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/team-portal/page.tsx",
  "app/team-portal/login/page.tsx",
  "app/team-portal/TeamPortalClient.tsx",
  "app/admin/team-portals/page.tsx",
  "app/api/team-portal/route.ts",
  "app/api/team-portal/upload/route.ts",
  "app/api/team-portal/youtube/connect/route.ts",
  "app/api/team-portal/youtube/callback/route.ts",
  "app/api/team-portal/youtube/broadcast/route.ts",
  "app/api/admin/team-portals/route.ts",
  "lib/team-portal/access.ts",
  "lib/team-portal/capabilities.ts",
  "lib/team-portal/crypto.ts",
  "lib/team-portal/youtube.ts",
  "supabase/migrations/20260814_001_team_partner_portal.sql",
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`);
}

function source(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const migration = source("supabase/migrations/20260814_001_team_partner_portal.sql");
for (const table of [
  "team_subscriptions",
  "team_portal_memberships",
  "team_media_submissions",
  "team_stat_submissions",
  "team_player_profile_requests",
  "team_broadcast_channels",
  "team_broadcasts",
]) {
  if (!migration.includes(`public.${table}`)) failures.push(`Migration does not define ${table}`);
}
if (!migration.includes("'eagles'")) failures.push("Eagles training-partner launch seed is missing");
if (!migration.includes("result in ('W','L')")) failures.push("Team result constraint is not win/loss-only");

const cryptoSource = source("lib/team-portal/crypto.ts");
if (!cryptoSource.includes('createCipheriv("aes-256-gcm"')) failures.push("YouTube secrets are not using AES-256-GCM");
const broadcastSource = source("app/api/team-portal/youtube/broadcast/route.ts");
if (/NextResponse\.json\([^)]*credentials_encrypted/s.test(broadcastSource)) failures.push("Broadcast response appears to expose encrypted credentials");

const activeBasketballFiles = [
  "app/admin/guest-one-on-one-stats/page.tsx",
  "app/admin/one-on-one/page.tsx",
  "app/components/GameCard.tsx",
  "app/events/[id]/page.tsx",
  "app/games/[id]/page.tsx",
  "app/guest-leaderboards/page.tsx",
  "app/one-on-one/[id]/page.tsx",
  "app/one-on-one/page.tsx",
  "app/players/[id]/page.tsx",
  "app/teams/[slug]/page.tsx",
  "lib/hoops/gamePresentation.ts",
  "lib/hoops/gameStatus.ts",
  "lib/hoops/publicPlayerProfiles.ts",
  "lib/hoops/teamProfiles.ts",
];
for (const file of activeBasketballFiles) {
  if (/(^|[^a-z])draw([^a-z]|$)/i.test(source(file))) failures.push(`Tied-result wording remains in ${file}`);
}

if (failures.length) {
  console.error("Team Partner Portal validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Team Partner Portal validation passed (${requiredFiles.length} required files, ${activeBasketballFiles.length} basketball surfaces).`);
