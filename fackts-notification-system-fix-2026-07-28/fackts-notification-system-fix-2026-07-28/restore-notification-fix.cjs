const fs = require("node:fs");
const path = require("node:path");

const packageRoot = __dirname;
const marker = path.join(packageRoot, ".last-backup.txt");

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

  throw new Error("Could not find the fackts-hoops-web project.");
}

function filesBelow(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(fullPath) : [fullPath];
  });
}

if (!fs.existsSync(marker)) {
  throw new Error("No notification-fix backup was found.");
}

const backupRoot = fs.readFileSync(marker, "utf8").trim();
const backupFiles = path.join(backupRoot, "files");
const createdList = path.join(backupRoot, "created-files.json");

if (!fs.existsSync(backupRoot)) {
  throw new Error(`The saved backup folder no longer exists: ${backupRoot}`);
}

const projectRoot = findProjectRoot();

for (const backup of filesBelow(backupFiles)) {
  const relative = path.relative(backupFiles, backup);
  const target = path.join(projectRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(backup, target);
}

const createdFiles = fs.existsSync(createdList)
  ? JSON.parse(fs.readFileSync(createdList, "utf8"))
  : [];

for (const relative of createdFiles) {
  const target = path.join(projectRoot, relative);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

console.log("");
console.log("SUCCESS: The previous notification files were restored.");
