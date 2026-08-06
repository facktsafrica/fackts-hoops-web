$ErrorActionPreference = "Stop"

function Find-FacktsProjectRoot {
    param([string]$StartPath)

    $cursor = (Resolve-Path $StartPath).Path

    for ($index = 0; $index -lt 12; $index++) {
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

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-1V1-RANKING-SCROLL.cmd again."
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\one-on-one\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

$installedMarker = 'data-mobile-full-stats-scroll'

if ($content.Contains($installedMarker)) {
    Write-Host ""
    Write-Host "1v1 mobile ranking scroll is already installed." -ForegroundColor Green
    Write-Host "No files were changed."
    exit 0
}

$mobileTablePattern = '(?s)<div className="sm:hidden">\s*<div className="grid grid-cols-\[30px_minmax\(92px,1fr\)_28px_28px_28px_42px_42px\][^"]*">\s*<span>#</span>\s*<span className="text-left">Hooper</span>\s*<span>P</span>\s*<span>W</span>\s*<span>L</span>\s*<span>\+/-</span>\s*<span>Win</span>\s*</div>\s*\{items\.map\(\(item, index\) => \(\s*<LeaderboardMobileRow\s+key=\{item\.id\}\s+item=\{item\}\s+position=\{index \+ 1\}\s*/>\s*\)\)\}\s*</div>'

$mobileRowPattern = '(?s)function LeaderboardMobileRow\(\{.*?\r?\n\}\r?\n\r?\nfunction LeaderboardDesktopRow'

$tableMatches = [regex]::Matches($content, $mobileTablePattern)
$rowMatches = [regex]::Matches($content, $mobileRowPattern)

if ($tableMatches.Count -ne 1) {
    throw "The current mobile ranking table was not found exactly once. Nothing was changed."
}

if ($rowMatches.Count -ne 1) {
    throw "The current mobile ranking row was not found exactly once. Nothing was changed."
}

$newMobileTable = @'
<div className="sm:hidden" data-mobile-full-stats-scroll>
            <div className="max-h-[60vh] touch-pan-x touch-pan-y overflow-auto overscroll-contain [scrollbar-gutter:stable]">
              <div className="sticky top-0 z-10 grid min-w-[650px] grid-cols-[42px_minmax(170px,1fr)_42px_42px_42px_42px_48px_48px_56px_60px] items-center gap-1 bg-[#0d2350] px-2 py-2 text-center text-[8px] font-black uppercase tracking-[0.08em] text-blue-200 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
                <span>Pos</span>
                <span className="text-left">Hooper</span>
                <span>P</span>
                <span>W</span>
                <span>D</span>
                <span>L</span>
                <span>PF</span>
                <span>PA</span>
                <span>+/-</span>
                <span>Win %</span>
              </div>
              {items.map((item, index) => (
                <LeaderboardMobileRow
                  key={item.id}
                  item={item}
                  position={index + 1}
                />
              ))}
            </div>
          </div>
'@

$newMobileRow = @'
function LeaderboardMobileRow({
  item,
  position,
}: {
  item: LeaderboardItem;
  position: number;
}) {
  return (
    <div
      className={`grid min-h-12 min-w-[650px] grid-cols-[42px_minmax(170px,1fr)_42px_42px_42px_42px_48px_48px_56px_60px] items-center gap-1 border-t border-white/7 px-2 py-2 text-center text-[10px] font-black transition hover:bg-blue-500/8 ${
        position === 1 ? "bg-orange-500/8" : "bg-black/10"
      }`}
    >
      <span
        className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md ${
          position === 1
            ? "bg-orange-500 text-black"
            : position <= 3
              ? "bg-blue-500/20 text-blue-200"
              : "text-slate-400"
        }`}
      >
        {position}
      </span>
      <span className="min-w-0 text-left">
        <span className="line-clamp-2 text-[11px] leading-3.5 text-white">
          {item.name}
        </span>
      </span>
      <span className="text-slate-300">{item.matches}</span>
      <span className="text-white">{item.wins}</span>
      <span className="text-slate-400">{item.draws}</span>
      <span className="text-slate-500">{item.losses}</span>
      <span className="text-slate-300">{item.points}</span>
      <span className="text-slate-400">{item.pointsAllowed}</span>
      <span className={item.pointDiff >= 0 ? "text-blue-300" : "text-orange-300"}>
        {item.pointDiff > 0 ? "+" : ""}
        {item.pointDiff}
      </span>
      <span className="text-white">{item.winRate}%</span>
    </div>
  );
}

function LeaderboardDesktopRow
'@

$mobileTableRegex = New-Object System.Text.RegularExpressions.Regex `
    -ArgumentList $mobileTablePattern
$mobileRowRegex = New-Object System.Text.RegularExpressions.Regex `
    -ArgumentList $mobileRowPattern

$updated = $mobileTableRegex.Replace(
    $content,
    [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $newMobileTable },
    1
)

$updated = $mobileRowRegex.Replace(
    $updated,
    [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $newMobileRow },
    1
)

if (-not $updated.Contains($installedMarker)) {
    throw "Safety verification failed before writing. Nothing was changed."
}

$requiredMobileStats = @(
    '{item.draws}',
    '{item.points}',
    '{item.pointsAllowed}',
    '{item.pointDiff}',
    '{item.winRate}%'
)

foreach ($requiredStat in $requiredMobileStats) {
    $statCount = ([regex]::Matches(
        $updated,
        [regex]::Escape($requiredStat)
    )).Count

    if ($statCount -lt 2) {
        throw "Full-stat verification failed for $requiredStat. Nothing was changed."
    }
}

$backupDirectory = Join-Path $projectRoot "fackts-one-on-one-ranking-scroll-backups"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupDirectory "page.tsx.$timestamp.bak"
Copy-Item -Path $target -Destination $backup

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)

Write-Host ""
Write-Host "1V1 MOBILE RANKING SCROLL INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\one-on-one\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "Phone rankings now include:"
Write-Host "  - vertical scrolling through every contestant"
Write-Host "  - sideways swiping through every statistic"
Write-Host "  - all 10 ranking columns"
Write-Host "  - a sticky ranking header"
Write-Host ""
Write-Host "Preserved:"
Write-Host "  - all earlier 1v1 card and typography fixes"
Write-Host "  - desktop ranking layout"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Run npm run dev"
Write-Host "  2. Open http://localhost:3000/one-on-one in phone view"
Write-Host "  3. Swipe inside Rankings vertically and sideways"
Write-Host "  4. Send a screenshot before pushing"
Write-Host ""
Write-Host "Do not push until the phone layout has been checked."
