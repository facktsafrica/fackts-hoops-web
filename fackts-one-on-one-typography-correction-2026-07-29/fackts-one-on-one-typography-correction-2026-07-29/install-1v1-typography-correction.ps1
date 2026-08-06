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

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-1V1-TYPOGRAPHY-CORRECTION.cmd again."
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\one-on-one\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

$replacements = @(
    @{
        Label = "battle row size"
        Old = 'className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] items-center gap-1.5 px-2.5 py-2 sm:min-h-[72px] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4 sm:px-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_220px]"'
        New = 'className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4 sm:px-4 sm:py-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_220px]"'
    },
    @{
        Label = "player photo size"
        Old = 'className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#10234a] sm:h-10 sm:w-10"'
        New = 'className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#10234a] sm:h-10 sm:w-10"'
    },
    @{
        Label = "player name typography"
        Old = 'className={`grid h-5 content-end overflow-hidden text-[8px] font-extrabold uppercase leading-[10px] tracking-[0.005em] sm:block sm:h-auto sm:overflow-visible sm:text-xs sm:font-black sm:leading-3.5 sm:tracking-[0.02em] ${'
        New = 'className={`line-clamp-2 min-h-[17px] text-[7px] font-bold uppercase leading-[8.5px] tracking-[0.015em] sm:min-h-0 sm:text-xs sm:font-black sm:leading-3.5 sm:tracking-[0.02em] ${'
    },
    @{
        Label = "player position typography"
        Old = 'className="mt-0.5 truncate text-[6.5px] font-semibold uppercase leading-none tracking-normal text-slate-500 sm:text-[9px] sm:font-bold sm:tracking-[0.04em]"'
        New = 'className="mt-1 truncate text-[6px] font-medium uppercase leading-none tracking-[0.01em] text-slate-500 sm:mt-0.5 sm:text-[9px] sm:font-bold sm:tracking-[0.04em]"'
    }
)

$allInstalled = $true
foreach ($replacement in $replacements) {
    if (-not $content.Contains($replacement.New)) {
        $allInstalled = $false
        break
    }
}

if ($allInstalled) {
    Write-Host ""
    Write-Host "1v1 typography correction is already installed." -ForegroundColor Green
    Write-Host "No files were changed."
    exit 0
}

$missing = @()
foreach ($replacement in $replacements) {
    if (
        -not $content.Contains($replacement.Old) -and
        -not $content.Contains($replacement.New)
    ) {
        $missing += $replacement.Label
    }
}

if ($missing.Count -gt 0) {
    throw "The expected 1v1 name/position polish was not found. Nothing was changed. Missing: $($missing -join ', ')."
}

$backupDirectory = Join-Path $projectRoot "fackts-one-on-one-typography-correction-backups"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupDirectory "page.tsx.$timestamp.bak"
Copy-Item -Path $target -Destination $backup

$updated = $content
foreach ($replacement in $replacements) {
    $updated = $updated.Replace($replacement.Old, $replacement.New)
}

foreach ($replacement in $replacements) {
    if (-not $updated.Contains($replacement.New)) {
        throw "Safety verification failed for $($replacement.Label). The original page remains available at $backup."
    }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)

Write-Host ""
Write-Host "1V1 TYPOGRAPHY CORRECTION INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\one-on-one\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "Corrected:"
Write-Host "  - battle-card height and breathing room restored"
Write-Host "  - player-photo size restored"
Write-Host "  - player names reduced and made less heavy"
Write-Host "  - player positions reduced and de-emphasized"
Write-Host "  - status, date, score and desktop styling preserved"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Run npm run dev"
Write-Host "  2. Open http://localhost:3000/one-on-one in phone view"
Write-Host "  3. Hard-refresh and send a screenshot before pushing"
Write-Host ""
Write-Host "Do not push until the page has been checked."
