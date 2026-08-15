import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const checks = [
  ["app/team-portal/BasketballIQWorkspace.tsx", 'formData.set("browser_ocr", "true")', "browser OCR completion is not sent to the import API"],
  ["app/api/team-portal/basketball-iq/import/route.ts", "const browserOcr =", "the import API does not recognize browser OCR"],
  ["app/api/team-portal/basketball-iq/import/route.ts", "const parsed = browserOcr ?", "the import API still reparses browser-OCR PDFs on the server"],
  ["app/api/team-portal/basketball-iq/import/route.ts", "const sourceRows = browserOcr ? ocrRows : parsed.rows", "browser OCR rows are not authoritative"],
  ["lib/basketball-iq/documentImport.ts", 'import("pdfjs-dist/legacy/build/pdf.worker.mjs")', "the server PDF worker is not bundled"],
  ["lib/basketball-iq/documentImport.ts", "pdfjsWorker?: unknown", "the PDF fake worker is not registered"],
  ["types/pdfjs-worker.d.ts", 'declare module "pdfjs-dist/legacy/build/pdf.worker.mjs"', "the bundled worker has no TypeScript declaration"],
  ["app/api/admin/team-portals/route.ts", 'from("team_roster_members")', "approval does not verify official club roster links"],
  ["app/api/admin/team-portals/route.ts", 'from("game_rosters").upsert', "approval does not attach official players to the game"],
  ["app/api/admin/team-portals/route.ts", 'from("player_game_stats")', "approval does not write canonical player game stats"],
  ["app/api/admin/team-portals/route.ts", 'verification_status: "verified"', "approval does not verify canonical records"],
  ["app/api/admin/team-portals/route.ts", "is_public: true", "approval does not publish the verified game"],
  ["app/api/admin/team-portals/route.ts", 'revalidatePath(`/teams/${publicTeam.data.slug}`)', "approval does not refresh the public club page"],
];

const failures = checks.flatMap(([file, needle, message]) => read(file).includes(needle) ? [] : [`${file}: ${message}`]);
const basketballSources = checks.map(([file]) => file).filter((file, index, files) => files.indexOf(file) === index);
for (const file of basketballSources) {
  if (/\bdraws?\b/i.test(read(file))) failures.push(`${file}: basketball wording contains draw/draws`);
}
if (/Team portals|Team portal membership|Team portal administration/i.test(read("app/api/admin/team-portals/route.ts"))) {
  failures.push("app/api/admin/team-portals/route.ts: user-facing administration wording must say Club Portals");
}

if (failures.length) {
  console.error("Stat publication hotfix validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Stat publication hotfix validation passed (browser OCR handoff, bundled PDF worker, official roster governance and public verified stats)." );
