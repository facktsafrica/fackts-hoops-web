import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const checks = [
  ["app/team-portal/BasketballIQWorkspace.tsx", 'readBasketballReportPdf', "the team portal does not start browser OCR"],
  ["app/team-portal/BasketballIQWorkspace.tsx", 'Confirm, create game and continue', "the detected-match confirmation is missing"],
  ["lib/basketball-iq/browserReportOcr.ts", 'const selected = [1, 3, 4, 5]', "the required report pages are not selected"],
  ["lib/basketball-iq/browserReportOcr.ts", 'import("tesseract.js")', "the image OCR engine is missing"],
  ["app/api/team-portal/basketball-iq/import/route.ts", 'verification_status: "unverified"', "created games are not explicitly unverified"],
  ["app/api/team-portal/basketball-iq/import/route.ts", 'is_public: false', "created games are not explicitly private"],
  ["app/api/team-portal/basketball-iq/import/route.ts", 'homeScore === awayScore', "basketball overtime-winner validation is missing"],
  ["app/api/team-portal/basketball-iq/import/route.ts", 'requireTeamCapability("stats_submit"', "statistician access governance is missing"],
];

const failures = checks.flatMap(([file, needle, message]) => read(file).includes(needle) ? [] : [`${file}: ${message}`]);
const parserSource = read("lib/basketball-iq/reportOcr.ts");
const transpiled = ts.transpileModule(parserSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  fileName: "reportOcr.ts",
  reportDiagnostics: true,
});
if (transpiled.diagnostics?.length) failures.push("reportOcr.ts could not be transpiled for its production fixture");

if (!failures.length) {
  const encoded = Buffer.from(transpiled.outputText).toString("base64");
  const { parseBasketballReportOcr } = await import(`data:text/javascript;base64,${encoded}`);
  const statLine = (number, name, points) => `${number} ${name} 10:00 ${points} 1 1 100.0% 0 0 0.0% 0 0 0.0% 0 0 0.0% 0 0 0 0 0 0 0 0 0 0 0 0`;
  const fixture = parseBasketballReportOcr({
    page1: "Game report Aug 1 2029",
    page3: "EAGLES 21 17 19 16 73\nMAB 15 21 16 15 6&7\nReferees",
    page4: statLine(4, "DENG CHOL", 73),
    page5: statLine(8, "PRINCE WANDERA", 67),
  }, [{ display_name: "Deng Chol", jersey_number: "4" }], "EAGLES_vs_MAB_(01-08-2026_21_41)_home_report.pdf");
  if (fixture.match?.home_score !== 73 || fixture.match?.away_score !== 67) failures.push("OCR fixture did not read the 73–67 final score");
  if (fixture.match?.game_date !== "2026-08-01") failures.push("OCR fixture did not preserve the report filename date");
  if (fixture.match?.period_scores?.length !== 4) failures.push("OCR fixture did not preserve all four quarter scores");
  if (fixture.rows?.length !== 1 || fixture.rows[0]?.player_name !== "Deng Chol") failures.push("OCR fixture did not choose the registered team's player table");
}

if (failures.length) {
  console.error("Game-report OCR validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Game-report OCR validation passed (private game creation, overtime winner, OCR fixture and Super Admin governance)." );
