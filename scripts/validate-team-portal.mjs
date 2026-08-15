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
  "app/api/admin/team-portals/stats/import/route.ts",
  "lib/team-portal/access.ts",
  "lib/team-portal/capabilities.ts",
  "lib/team-portal/crypto.ts",
  "lib/team-portal/youtube.ts",
  "lib/hoops/leagues.ts",
  "app/leagues/page.tsx",
  "app/leagues/[slug]/page.tsx",
  "supabase/migrations/20260814_001_team_partner_portal.sql",
  "supabase/migrations/20260814_002_club_portals_and_leagues.sql",
  "supabase/migrations/20260814_003_phase2_basketball_iq.sql",
  "app/team-portal/BasketballIQWorkspace.tsx",
  "app/api/team-portal/basketball-iq/route.ts",
  "app/api/team-portal/basketball-iq/import/route.ts",
  "lib/basketball-iq/insights.ts",
  "lib/basketball-iq/documentImport.ts",
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`);
}

function source(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const migration = `${source("supabase/migrations/20260814_001_team_partner_portal.sql")}\n${source("supabase/migrations/20260814_002_club_portals_and_leagues.sql")}\n${source("supabase/migrations/20260814_003_phase2_basketball_iq.sql")}`;
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
if (!migration.includes("public.leagues") || !migration.includes("public.team_league_memberships")) failures.push("League network tables are missing");
if (!migration.includes("Core club workspace")) failures.push("Registered-team core access is missing");
if (!migration.includes("synthetic_team_id")) failures.push("Synthetic Eagles cleanup is missing");
if (!migration.includes("result in ('W','L')")) failures.push("Team result constraint is not win/loss-only");
for (const table of ["team_stat_imports", "team_stat_sessions", "team_player_stat_lines", "team_performance_briefings"]) {
  if (!migration.includes(`public.${table}`)) failures.push(`Basketball IQ migration does not define ${table}`);
}
if (!migration.includes("'team-stat-imports'")) failures.push("Private stat-document storage is missing");

const intelligenceSource = source("app/api/team-portal/basketball-iq/route.ts");
if (!intelligenceSource.includes('requireTeamCapability("stats_submit"')) failures.push("Basketball IQ API is not capability-gated");
if (!intelligenceSource.includes('submission_type: "team_stat_session"')) failures.push("Complete stat sessions do not enter the Super Admin queue");
const importSource = source("app/api/team-portal/basketball-iq/import/route.ts");
if (!importSource.includes('storage.from("team-stat-imports")')) failures.push("Stat documents are not stored in the private import bucket");
if (!importSource.includes("await parseStatDocument")) failures.push("Team stat imports are not awaiting document extraction");
const documentImportSource = source("lib/basketball-iq/documentImport.ts");
if (!documentImportSource.includes('pdfjs-dist/legacy/build/pdf.mjs')) failures.push("PDF imports are not using an embedded-font-aware text engine");
if (!documentImportSource.includes("image-only, scanned")) failures.push("Scanned PDFs do not receive a clear review warning");
const reviewSource = source("app/api/admin/team-portals/route.ts");
if (!reviewSource.includes('text(payload.submission_type, 60) === "team_stat_session"')) failures.push("Super Admin cannot review complete club stat sessions");
const adminImportSource = source("app/api/admin/team-portals/stats/import/route.ts");
if (!adminImportSource.includes("parseStatDocument") || !adminImportSource.includes('submission_type: "team_stat_session"')) failures.push("Super Admin team-stat upload is incomplete");
if (!intelligenceSource.includes('"statistician"')) failures.push("Statistician briefing publication is not enabled");
const accessSource = source("lib/team-portal/access.ts");
if (!accessSource.includes("getTeamPortalTeams")) failures.push("One account cannot discover multiple assigned clubs");
const portalSource = source("app/team-portal/TeamPortalClient.tsx");
for (const forbidden of ["Access unavailable", "Official profiling locked", "Super Admin activation required"]) {
  if (portalSource.includes(forbidden)) failures.push(`Role-hidden portal still exposes: ${forbidden}`);
}
const publicTeamSource = source("lib/hoops/teamProfiles.ts");
if (!publicTeamSource.includes("loadVerifiedTeamStats") || !publicTeamSource.includes('from("player_game_stats")')) failures.push("Public team profiles do not aggregate verified player statistics");

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
  "lib/hoops/leagues.ts",
  "app/leagues/[slug]/page.tsx",
  "app/team-portal/TeamPortalClient.tsx",
  "app/team-portal/BasketballIQWorkspace.tsx",
  "app/player/page.tsx",
  "app/api/team-portal/basketball-iq/route.ts",
  "app/api/admin/team-portals/route.ts",
];
const forbiddenResultWord = new RegExp(`(^|[^a-z])d${"raw"}([^a-z]|$)`, "i");
for (const file of activeBasketballFiles) {
  if (forbiddenResultWord.test(source(file))) failures.push(`Tied-result wording remains in ${file}`);
}

if (failures.length) {
  console.error("Club Portal validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Club Portal validation passed (${requiredFiles.length} required files, ${activeBasketballFiles.length} basketball surfaces).`);
