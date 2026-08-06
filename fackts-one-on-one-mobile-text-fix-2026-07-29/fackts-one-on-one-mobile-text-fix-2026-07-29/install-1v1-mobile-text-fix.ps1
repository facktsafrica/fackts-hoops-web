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

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-1V1-MOBILE-TEXT-FIX.cmd again."
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\one-on-one\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

$replacements = @(
    @{
        Label = "mobile card header"
        Old = 'className="flex min-h-7 items-center justify-between gap-2 border-b border-white/8 bg-[#0d1d3e] px-3 py-1.5 md:hidden"'
        New = 'className="flex min-h-7 items-center justify-between gap-1.5 border-b border-white/8 bg-[#0d1d3e] px-2.5 py-1.5 md:hidden"'
    },
    @{
        Label = "mobile header left group"
        Old = 'className="flex min-w-0 items-center gap-1.5"'
        New = 'className="flex min-w-0 flex-1 items-center gap-1"'
    },
    @{
        Label = "match number text"
        Old = 'className="shrink-0 text-[8px] font-black uppercase tracking-[0.08em] text-slate-400"'
        New = 'className="min-w-0 truncate text-[7px] font-black uppercase tracking-[0.03em] text-slate-400 sm:text-[8px] sm:tracking-[0.08em]"'
    },
    @{
        Label = "date and time text"
        Old = 'className="truncate text-right text-[9px] font-black uppercase tracking-[0.04em] text-blue-100"'
        New = 'className="shrink-0 whitespace-nowrap text-right text-[7px] font-black uppercase tracking-[-0.01em] text-blue-100 sm:text-[9px] sm:tracking-[0.04em]"'
    },
    @{
        Label = "mobile fighter grid"
        Old = 'className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_220px]"'
        New = 'className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] items-center gap-1.5 px-2.5 py-2 sm:min-h-[72px] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4 sm:px-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_220px]"'
    },
    @{
        Label = "score column"
        Old = 'className="min-w-[62px] text-center sm:min-w-[82px]"'
        New = 'className="min-w-0 text-center sm:min-w-[82px]"'
    },
    @{
        Label = "match type label"
        Old = 'className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500"'
        New = 'className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-500 sm:text-[8px] sm:tracking-[0.16em]"'
    },
    @{
        Label = "score text"
        Old = 'className="mt-1 whitespace-nowrap text-xl font-black leading-none text-white sm:text-2xl"'
        New = 'className="mt-1 whitespace-nowrap text-lg font-black leading-none text-white sm:text-2xl"'
    },
    @{
        Label = "fighter spacing"
        Old = 'className={`flex items-center gap-2 ${'
        New = 'className={`flex items-center gap-1.5 sm:gap-2 ${'
    },
    @{
        Label = "fighter photo"
        Old = 'className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#10234a] sm:h-10 sm:w-10"'
        New = 'className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#10234a] sm:h-10 sm:w-10"'
    },
    @{
        Label = "fighter name"
        Old = 'className={`line-clamp-2 text-[10px] font-black uppercase leading-3.5 tracking-[0.02em] sm:text-xs ${'
        New = 'className={`line-clamp-2 text-[9px] font-black uppercase leading-3 tracking-[-0.01em] sm:text-xs sm:leading-3.5 sm:tracking-[0.02em] ${'
    },
    @{
        Label = "fighter position"
        Old = 'className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-[0.04em] text-slate-500 sm:text-[9px]"'
        New = 'className="mt-0.5 truncate text-[7px] font-bold uppercase tracking-[-0.01em] text-slate-500 sm:text-[9px] sm:tracking-[0.04em]"'
    },
    @{
        Label = "status badge"
        Old = 'className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${className}`}'
        New = 'className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.04em] sm:px-2 sm:text-[8px] sm:tracking-[0.12em] ${className}`}'
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
    Write-Host "1v1 mobile text fix is already installed." -ForegroundColor Green
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
    throw "The 1v1 page is different from the expected live version. Nothing was changed. Missing: $($missing -join ', ')."
}

$backupDirectory = Join-Path $projectRoot "fackts-one-on-one-mobile-text-fix-backups"
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
Write-Host "1V1 MOBILE TEXT FIX INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\one-on-one\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "Fixed:"
Write-Host "  - COMPLETED stays on one line"
Write-Host "  - header details fit more cleanly"
Write-Host "  - player names and positions use compact mobile text"
Write-Host "  - desktop styling remains unchanged"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Run npm run dev"
Write-Host "  2. Open http://localhost:3000/one-on-one in phone view"
Write-Host "  3. Send a screenshot before pushing"
Write-Host ""
Write-Host "Do not push until the page has been checked."
