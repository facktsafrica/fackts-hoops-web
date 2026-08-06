$ErrorActionPreference = "Stop"

function Find-FacktsProjectRoot {
    param([string]$StartPath)

    $cursor = (Resolve-Path $StartPath).Path

    for ($index = 0; $index -lt 7; $index++) {
        $packageJson = Join-Path $cursor "package.json"
        $oneOnOnePage = Join-Path $cursor "app\one-on-one\page.tsx"

        if ((Test-Path $packageJson) -and (Test-Path $oneOnOnePage)) {
            return $cursor
        }

        $parent = Split-Path $cursor -Parent
        if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $cursor) {
            break
        }

        $cursor = $parent
    }

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-1V1-POSITION-FINAL.cmd again."
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\one-on-one\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

$helperAnchor = @'
function getPersonPosition(person?: Player | GuestHooper | null) {
  if (!person) return "";
  return person.position || "";
}

function getInitials(name: string) {
'@

$helperInstalled = @'
function getPersonPosition(person?: Player | GuestHooper | null) {
  if (!person) return "";
  return person.position || "";
}

function toSentenceCase(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "";
}

function getInitials(name: string) {
'@

$oldPositionClasses = @(
    'className="mt-1 truncate text-[6px] font-medium uppercase leading-none tracking-[0.01em] text-slate-500 sm:mt-0.5 sm:text-[9px] sm:font-bold sm:tracking-[0.04em]"',
    'className="mt-0.5 truncate text-[6.5px] font-semibold uppercase leading-none tracking-normal text-slate-500 sm:text-[9px] sm:font-bold sm:tracking-[0.04em]"',
    'className="mt-0.5 truncate text-[7px] font-bold uppercase tracking-[-0.01em] text-slate-500 sm:text-[9px] sm:tracking-[0.04em]"'
)

$newPositionClass = 'className="mt-1 truncate text-[7px] font-black leading-none tracking-[0.01em] text-slate-500 sm:mt-0.5 sm:text-[8px] sm:font-black sm:tracking-[0.04em]"'
$oldPositionValue = '{identity.position || identity.type.replace("_", " ")}'
$newPositionValue = '{toSentenceCase(identity.position || identity.type.replace("_", " "))}'

$alreadyInstalled = (
    $content.Contains($helperInstalled) -and
    $content.Contains($newPositionClass) -and
    $content.Contains($newPositionValue)
)

if ($alreadyInstalled) {
    Write-Host ""
    Write-Host "1v1 player-position final is already installed." -ForegroundColor Green
    Write-Host "No files were changed."
    exit 0
}

if (-not $content.Contains($helperInstalled) -and -not $content.Contains($helperAnchor)) {
    throw "The expected position helper area was not found. Nothing was changed."
}

$hasKnownPositionClass = $content.Contains($newPositionClass)
foreach ($candidate in $oldPositionClasses) {
    if ($content.Contains($candidate)) {
        $hasKnownPositionClass = $true
        break
    }
}

if (-not $hasKnownPositionClass) {
    throw "The expected current player-position styling was not found. Nothing was changed."
}

if (-not $content.Contains($newPositionValue) -and -not $content.Contains($oldPositionValue)) {
    throw "The expected player-position text was not found. Nothing was changed."
}

$backupDirectory = Join-Path $projectRoot "fackts-one-on-one-position-final-backups"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupDirectory "page.tsx.$timestamp.bak"
Copy-Item -Path $target -Destination $backup

$updated = $content

if (-not $updated.Contains($helperInstalled)) {
    $updated = $updated.Replace($helperAnchor, $helperInstalled)
}

foreach ($candidate in $oldPositionClasses) {
    if ($updated.Contains($candidate)) {
        $updated = $updated.Replace($candidate, $newPositionClass)
        break
    }
}

if ($updated.Contains($oldPositionValue)) {
    $updated = $updated.Replace($oldPositionValue, $newPositionValue)
}

if (
    -not $updated.Contains($helperInstalled) -or
    -not $updated.Contains($newPositionClass) -or
    -not $updated.Contains($newPositionValue)
) {
    throw "Safety verification failed. The original page remains available at $backup."
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)

Write-Host ""
Write-Host "1V1 PLAYER POSITION FINAL INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\one-on-one\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "Updated:"
Write-Host "  - positions now use sentence case"
Write-Host "  - position size now matches the COMPLETED label"
Write-Host "  - position boldness now matches the COMPLETED label"
Write-Host "  - player names, cards, photos, scores and spacing were preserved"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Run npm run dev"
Write-Host "  2. Open http://localhost:3000/one-on-one in phone view"
Write-Host "  3. Hard-refresh and send a screenshot before pushing"
Write-Host ""
Write-Host "Do not push until the page has been checked."
