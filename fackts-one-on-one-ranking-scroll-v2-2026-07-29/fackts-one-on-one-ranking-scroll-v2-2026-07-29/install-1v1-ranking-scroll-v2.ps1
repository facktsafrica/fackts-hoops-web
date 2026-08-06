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

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-1V1-RANKING-SCROLL-V2.cmd again."
}

function Get-UniqueIndex {
    param(
        [string]$Text,
        [string]$Needle,
        [string]$Label
    )

    $first = $Text.IndexOf($Needle, [System.StringComparison]::Ordinal)
    $last = $Text.LastIndexOf($Needle, [System.StringComparison]::Ordinal)

    if ($first -lt 0 -or $first -ne $last) {
        throw "Could not safely find exactly one $Label. Nothing was changed."
    }

    return $first
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\one-on-one\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

$installedMarker = "data-mobile-rankings-scroll-v2"

if ($content.Contains($installedMarker)) {
    Write-Host ""
    Write-Host "1v1 mobile ranking scroll V2 is already installed." -ForegroundColor Green
    Write-Host "No files were changed."
    exit 0
}

$cardStart = Get-UniqueIndex `
    -Text $content `
    -Needle "function LeaderboardCard(" `
    -Label "LeaderboardCard function"

$mobileRowStart = Get-UniqueIndex `
    -Text $content `
    -Needle "function LeaderboardMobileRow(" `
    -Label "LeaderboardMobileRow function"

$desktopRowStart = Get-UniqueIndex `
    -Text $content `
    -Needle "function LeaderboardDesktopRow(" `
    -Label "LeaderboardDesktopRow function"

if (-not ($cardStart -lt $mobileRowStart -and $mobileRowStart -lt $desktopRowStart)) {
    throw "The Rankings functions are not in the expected order. Nothing was changed."
}

$newLeaderboardCard = @'
function LeaderboardCard({
  eyebrow,
  title,
  emptyText,
  items,
}: {
  eyebrow: string;
  title: string;
  emptyText: string;
  items: LeaderboardItem[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#213766] bg-[#071127]/95 shadow-2xl shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-3xl font-black">{title}</h2>
        </div>

        <p className="text-xs font-bold text-zinc-500">
          Wins - win rate - point difference
        </p>
      </div>

      {items.length > 0 ? (
        <>
          <div className="sm:hidden" data-mobile-rankings-scroll-v2>
            <div className="flex items-center justify-between border-b border-blue-300/15 bg-[#0a1936] px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-blue-100">
              <span>Swipe sideways for all stats</span>
              <span aria-hidden="true" className="text-sm leading-none text-orange-300">
                &harr;
              </span>
            </div>

            <div
              className="relative"
              style={{
                maxHeight: "390px",
                overflowX: "auto",
                overflowY: "auto",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-x pan-y",
                scrollbarGutter: "stable",
              }}
            >
              <table
                className="border-separate border-spacing-0 text-center text-[10px] font-black"
                style={{ minWidth: "760px", width: "760px" }}
              >
                <colgroup>
                  <col style={{ width: "54px" }} />
                  <col style={{ width: "190px" }} />
                  <col style={{ width: "48px" }} />
                  <col style={{ width: "48px" }} />
                  <col style={{ width: "48px" }} />
                  <col style={{ width: "48px" }} />
                  <col style={{ width: "58px" }} />
                  <col style={{ width: "58px" }} />
                  <col style={{ width: "72px" }} />
                  <col style={{ width: "80px" }} />
                </colgroup>
                <thead className="sticky top-0 z-20 bg-[#0d2350] text-[8px] uppercase tracking-[0.08em] text-blue-200">
                  <tr>
                    <th className="border-b border-white/10 px-2 py-2">Rank</th>
                    <th className="border-b border-white/10 px-3 py-2 text-left">Player</th>
                    <th className="border-b border-white/10 px-2 py-2">P</th>
                    <th className="border-b border-white/10 px-2 py-2">W</th>
                    <th className="border-b border-white/10 px-2 py-2">D</th>
                    <th className="border-b border-white/10 px-2 py-2">L</th>
                    <th className="border-b border-white/10 px-2 py-2">PF</th>
                    <th className="border-b border-white/10 px-2 py-2">PA</th>
                    <th className="border-b border-white/10 px-2 py-2">+/-</th>
                    <th className="border-b border-white/10 px-2 py-2">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <LeaderboardMobileRow
                      key={item.id}
                      item={item}
                      position={index + 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="grid grid-cols-[42px_minmax(170px,1fr)_42px_42px_42px_42px_50px_50px_56px_62px] items-center gap-1 bg-[#0d2350] px-4 py-2 text-center text-[9px] font-black uppercase tracking-[0.09em] text-blue-200">
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
              <LeaderboardDesktopRow
                key={item.id}
                item={item}
                position={index + 1}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="bg-black/30 p-4 text-sm text-zinc-500">{emptyText}</p>
      )}
    </div>
  );
}

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
    <tr
      className={
        position === 1
          ? "bg-orange-500/8"
          : "bg-black/10"
      }
    >
      <td className="border-b border-white/7 px-2 py-2.5">
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
      </td>
      <td className="whitespace-nowrap border-b border-white/7 px-3 py-2.5 text-left text-[11px] text-white">
        {item.name}
      </td>
      <td className="border-b border-white/7 px-2 py-2.5 text-slate-300">{item.matches}</td>
      <td className="border-b border-white/7 px-2 py-2.5 text-white">{item.wins}</td>
      <td className="border-b border-white/7 px-2 py-2.5 text-slate-400">{item.draws}</td>
      <td className="border-b border-white/7 px-2 py-2.5 text-slate-500">{item.losses}</td>
      <td className="border-b border-white/7 px-2 py-2.5 text-slate-300">{item.points}</td>
      <td className="border-b border-white/7 px-2 py-2.5 text-slate-400">{item.pointsAllowed}</td>
      <td
        className={`border-b border-white/7 px-2 py-2.5 ${
          item.pointDiff >= 0 ? "text-blue-300" : "text-orange-300"
        }`}
      >
        {item.pointDiff > 0 ? "+" : ""}
        {item.pointDiff}
      </td>
      <td className="border-b border-white/7 px-2 py-2.5 text-white">{item.winRate}%</td>
    </tr>
  );
}

'@

$updated = (
    $content.Substring(0, $cardStart) +
    $newLeaderboardCard +
    $newMobileRow +
    $content.Substring($desktopRowStart)
)

$requiredFragments = @(
    $installedMarker,
    'maxHeight: "390px"',
    'overflowX: "auto"',
    'overflowY: "auto"',
    'style={{ minWidth: "760px", width: "760px" }}',
    '{item.draws}',
    '{item.points}',
    '{item.pointsAllowed}',
    '{item.pointDiff}',
    '{item.winRate}%'
)

foreach ($fragment in $requiredFragments) {
    if (-not $updated.Contains($fragment)) {
        throw "V2 safety verification failed before writing. Nothing was changed."
    }
}

if (
    $updated.IndexOf("function LeaderboardDesktopRow(", [System.StringComparison]::Ordinal) -lt 0 -or
    $updated.IndexOf("function StatCard(", [System.StringComparison]::Ordinal) -lt 0
) {
    throw "Desktop or later page content verification failed. Nothing was changed."
}

$backupDirectory = Join-Path $projectRoot "fackts-one-on-one-ranking-scroll-v2-backups"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupDirectory "page.tsx.$timestamp.bak"
Copy-Item -Path $target -Destination $backup

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)

Write-Host ""
Write-Host "1V1 MOBILE RANKING SCROLL V2 INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\one-on-one\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "You should now visibly see:"
Write-Host "  - Swipe sideways for all stats"
Write-Host "  - Rank, Player, P, W, D, L, PF, PA, +/-, Win %"
Write-Host "  - horizontal and vertical scrolling inside Rankings"
Write-Host ""
Write-Host "Preserved:"
Write-Host "  - all earlier 1v1 battle-card and typography fixes"
Write-Host "  - desktop Rankings layout"
Write-Host ""
Write-Host "IMPORTANT:"
Write-Host "  1. Stop the current dev server with Ctrl+C"
Write-Host "  2. Run npm run dev again"
Write-Host "  3. Hard-refresh http://localhost:3000/one-on-one"
Write-Host "  4. Do not push until the phone result has been checked"
