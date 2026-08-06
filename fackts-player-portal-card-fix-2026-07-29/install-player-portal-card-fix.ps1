$ErrorActionPreference = "Stop"

function Find-FacktsProjectRoot {
    param([string]$StartPath)

    $cursor = (Resolve-Path $StartPath).Path

    for ($index = 0; $index -lt 7; $index++) {
        $packageJson = Join-Path $cursor "package.json"
        $playerPage = Join-Path $cursor "app\player\page.tsx"

        if ((Test-Path $packageJson) -and (Test-Path $playerPage)) {
            return $cursor
        }

        $parent = Split-Path $cursor -Parent
        if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $cursor) {
            break
        }

        $cursor = $parent
    }

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-PLAYER-CARD-FIX.cmd again."
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\player\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

$oldCard = 'className={`group relative isolate min-h-44 overflow-hidden rounded-3xl border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)] ${'
$newCard = 'className={`group relative isolate min-h-[132px] overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:min-h-44 sm:rounded-3xl ${'

$oldInner = '<div className="flex h-full min-h-34 flex-col justify-between">'
$newInner = '<div className="relative flex min-h-[132px] flex-col justify-between p-4 sm:min-h-44 sm:p-5">'

$oldTitle = '<p className="max-w-xs text-xl font-black leading-tight text-white drop-shadow-lg">{title}</p>'
$newTitle = '<p className="max-w-xs text-lg font-black leading-tight text-white drop-shadow-lg sm:text-xl">{title}</p>'

$oldDescription = '<p className="mt-2 max-w-sm text-sm leading-6 text-slate-300 drop-shadow">{text}</p>'
$newDescription = '<p className="mt-1 line-clamp-2 max-w-sm text-xs leading-5 text-slate-300 drop-shadow sm:mt-2 sm:text-sm sm:leading-6">{text}</p>'

if (
    $content.Contains($newCard) -and
    $content.Contains($newInner) -and
    $content.Contains($newTitle) -and
    $content.Contains($newDescription)
) {
    Write-Host ""
    Write-Host "Player portal card fix is already installed." -ForegroundColor Green
    Write-Host "No files were changed."
    exit 0
}

$missing = @()
if (-not $content.Contains($oldCard)) { $missing += "card container" }
if (-not $content.Contains($oldInner)) { $missing += "card content wrapper" }
if (-not $content.Contains($oldTitle)) { $missing += "card title" }
if (-not $content.Contains($oldDescription)) { $missing += "card description" }

if ($missing.Count -gt 0) {
    throw "The player page is different from the expected live version. Nothing was changed. Missing: $($missing -join ', ')."
}

$backupDirectory = Join-Path $projectRoot "fackts-player-portal-card-fix-backups"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupDirectory "page.tsx.$timestamp.bak"
Copy-Item -Path $target -Destination $backup

$updated = $content.Replace($oldCard, $newCard)
$updated = $updated.Replace($oldInner, $newInner)
$updated = $updated.Replace($oldTitle, $newTitle)
$updated = $updated.Replace($oldDescription, $newDescription)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)

Write-Host ""
Write-Host "PLAYER PORTAL CARD FIX INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\player\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Run npm run dev"
Write-Host "  2. Open http://localhost:3000/player on your phone-size preview"
Write-Host "  3. Confirm the cards are compact and all text has safe padding"
Write-Host ""
Write-Host "Do not push until the page has been checked."
