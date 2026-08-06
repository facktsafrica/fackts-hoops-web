const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const packageRoot = __dirname;

function findProjectRoot() {
  let candidate = path.dirname(packageRoot);

  for (let index = 0; index < 6; index += 1) {
    const packageJson = path.join(candidate, "package.json");
    if (fs.existsSync(packageJson)) {
      const parsed = JSON.parse(fs.readFileSync(packageJson, "utf8"));
      if (parsed.name === "fackts-hoops-web") return candidate;
    }

    const parent = path.dirname(candidate);
    if (parent === candidate) break;
    candidate = parent;
  }

  throw new Error(
    "Could not find the fackts-hoops-web project. Keep this extracted folder inside the project folder."
  );
}

function normalizedSha256(filePath) {
  const normalized = fs
    .readFileSync(filePath, "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

const projectRoot = findProjectRoot();
const fileRules = [
  {
    file: "lib/notifications/server.ts",
    baseline:
      "6972c385b58f1a4fe4fb2d6ab7145e9d9de2c840cd671a00a1c1aad02190b77c",
  },
  {
    file: "app/api/push/test/route.ts",
    baseline:
      "74dcb09f1f8dd8a59e1ddd28e8ff8360b3d3a75e1b03310d5235b8c9c99614c5",
  },
  {
    file: "app/api/push/subscribe/route.ts",
    baseline:
      "2d797b64415a037946b9bd83cd47974de856d38e86a266c068a33990fa8d4e0d",
  },
  {
    file: "app/components/PushNotificationManager.tsx",
    baseline:
      "1e72233b58208da637928554d8f8947f5936835f9a580398bc7c79be0b35188c",
  },
  {
    file: "lib/notifications/vapid.ts",
    baseline: null,
  },
];

const conflicts = [];
const changesNeeded = [];

for (const rule of fileRules) {
  const source = path.join(packageRoot, "files", rule.file);
  const target = path.join(projectRoot, rule.file);

  if (!fs.existsSync(source)) {
    throw new Error(`Package file is missing: ${rule.file}`);
  }

  const sourceHash = normalizedSha256(source);

  if (!fs.existsSync(target)) {
    if (rule.baseline) conflicts.push(`${rule.file} is missing`);
    else changesNeeded.push(rule);
    continue;
  }

  const targetHash = normalizedSha256(target);
  if (targetHash === sourceHash) continue;

  if (!rule.baseline || targetHash !== rule.baseline) {
    conflicts.push(rule.file);
    continue;
  }

  changesNeeded.push(rule);
}

if (conflicts.length > 0) {
  console.log("");
  console.log("STOPPED SAFELY: No files were changed.");
  console.log("These notification files differ from commit 5d27d2b:");
  for (const conflict of conflicts) console.log(` - ${conflict}`);
  console.log("");
  console.log("Keep your local work and send this screen.");
  process.exitCode = 1;
  return;
}

if (changesNeeded.length === 0) {
  console.log("");
  console.log("SUCCESS: The notification fix is already installed.");
  return;
}

const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  "-",
  String(now.getHours()).padStart(2, "0"),
  String(now.getMinutes()).padStart(2, "0"),
  String(now.getSeconds()).padStart(2, "0"),
].join("");
const backupRoot = path.join(packageRoot, "backups", timestamp);
const backupFiles = path.join(backupRoot, "files");
const createdFiles = [];

fs.mkdirSync(backupFiles, { recursive: true });

for (const rule of changesNeeded) {
  const source = path.join(packageRoot, "files", rule.file);
  const target = path.join(projectRoot, rule.file);

  if (fs.existsSync(target)) {
    const backup = path.join(backupFiles, rule.file);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(target, backup);
  } else {
    createdFiles.push(rule.file);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

fs.writeFileSync(
  path.join(backupRoot, "created-files.json"),
  JSON.stringify(createdFiles, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(packageRoot, ".last-backup.txt"),
  backupRoot,
  "utf8"
);

console.log("");
console.log("SUCCESS: FACKTS notification system fix installed.");
console.log(`Backup: ${backupRoot}`);
console.log("");
console.log("Next: run npm run build from the fackts-hoops-web project.");
