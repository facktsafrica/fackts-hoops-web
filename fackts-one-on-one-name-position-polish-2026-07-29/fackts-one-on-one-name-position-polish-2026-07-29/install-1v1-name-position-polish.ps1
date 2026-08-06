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

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-1V1-NAME-POSITION-POLISH.cmd again."
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\one-on-one\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

$replacements = @(
    @{
        Label = "player name styling"
        Old = 'className={`line-clamp-2 text-[9px] font-black uppercase leading-3 tracking-[-0.01em] sm:text-xs sm:leading-3.5 sm:tracking-[0.02em] ${'
        New = 'className={`grid h-5 content-end overflow-hidden text-[8px] font-extrabold uppercase leading-[10px] tracking-[0.005em] sm:block sm:h-auto sm:overflow-visible sm:text-xs sm:font-black sm:leading-3.5 sm:tracking-[0.02em] ${'
    },
    @{
        Label = "player position styling"
        Old = 'className="mt-0.5 truncate text-[7px] font-bold uppercase tracking-[-0.01em] text-slate-500 sm:text-[9px] sm:tracking-[0.04em]"'
        New = 'className="mt-0.5 truncate text-[6.5px] font-semibold uppercase leading-none tracking-normal text-slate-500 sm:text-[9px] sm:font-bold sm:tracking-[0.04em]"'
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
    Write-Host "1v1 name and position polish is already installed." -ForegroundColor Green
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
    throw "The expected 1v1 mobile text fix was not found. Nothing was changed. Missing: $($missing -join ', '). Install and test the earlier 1v1 mobile text fix first."
}

$backupDirectory = Join-Path $projectRoot "fackts-one-on-one-name-position-polish-backups"
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
Write-Host "1V1 NAME + POSITION POLISH INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\one-on-one\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "Improved:"
Write-Host "  - smaller, quieter player positions"
Write-Host "  - cleaner two-line player names"
Write-Host "  - consistent name and position alignment"
Write-Host "  - desktop typography remains unchanged"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Run npm run dev"
Write-Host "  2. Open http://localhost:3000/one-on-one in phone view"
Write-Host "  3. Hard-refresh and send a screenshot before pushing"
Write-Host ""
Write-Host "Do not push until the page has been checked."

