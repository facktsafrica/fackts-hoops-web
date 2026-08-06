$ErrorActionPreference = "Stop"

$defaultProjectRoot = Join-Path $env:USERPROFILE "Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
$projectRoot = if ($env:FACKTS_PROJECT_ROOT) {
  $env:FACKTS_PROJECT_ROOT
} else {
  $defaultProjectRoot
}

$target = Join-Path $projectRoot "app\players\page.tsx"
$backup = Join-Path $projectRoot "app\players\page.tsx.before-v4"

if (-not (Test-Path -LiteralPath $target)) {
  Write-Host ""
  Write-Host "ERROR: Could not find app\players\page.tsx" -ForegroundColor Red
  Write-Host "Expected project: $projectRoot" -ForegroundColor Yellow
  exit 1
}

$source = [System.IO.File]::ReadAllText($target)

$mobileStart = $source.IndexOf("function MobilePlayerRow({")
$desktopStart = $source.IndexOf("function DesktopPlayerCard({")
$mobileStatStart = $source.IndexOf("function MobileStat({")
$heroStatStart = $source.IndexOf("function HeroMiniStat({")

if (
  $mobileStart -lt 0 -or
  $desktopStart -le $mobileStart -or
  $mobileStatStart -le $desktopStart -or
  $heroStatStart -le $mobileStatStart
) {
  Write-Host ""
  Write-Host "ERROR: The expected mobile-card sections were not found." -ForegroundColor Red
  Write-Host "Nothing was changed." -ForegroundColor Yellow
  exit 1
}

$mobileRow = @'
function MobilePlayerRow({
  player,
  featured = false,
}: {
  player: PlayerCard;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="fackts-mobile-player-row group relative grid h-[100px] grid-cols-[5.5rem_minmax(0,1fr)] overflow-hidden rounded-[1.05rem] bg-[linear-gradient(112deg,#161616_0%,#090909_64%,#180a02_100%)] shadow-lg shadow-black/30 transition duration-300 active:scale-[0.985] md:hidden"
    >
      <div className="relative h-[100px] overflow-hidden bg-zinc-950">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={getPlayerName(player)}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-active:scale-105"
            style={{
              objectPosition: player.photo_position || "center center",
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,_rgba(249,115,22,0.28),_transparent_58%),#050505]">
            <div className="text-center">
              <div className="text-3xl font-black text-orange-500">
                {getInitials(player) || "FH"}
              </div>
              <div className="mt-1 whitespace-nowrap text-[7px] font-black uppercase tracking-[0.08em] text-zinc-600">
                FACKTS Player
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-y-0 left-0 w-1 bg-orange-500" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/45" />

        {hasValue(player.jersey_number) ? (
          <span className="absolute bottom-1.5 left-2 z-10 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-black leading-none text-black shadow-lg shadow-black/30">
            #{player.jersey_number}
          </span>
        ) : null}
      </div>

      <div className="relative flex min-w-0 flex-col justify-between px-2.5 py-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-1.5">
            <div className="min-w-0 flex-1 text-[15px] font-black leading-[1.05] text-white transition group-active:text-orange-200">
              {getPlayerName(player)}
            </div>

            {featured ? (
              <span className="shrink-0 rounded bg-orange-500/15 px-1.5 py-0.5 text-[6px] font-black uppercase leading-none tracking-[0.04em] text-orange-300">
                Featured
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0 text-[8px] font-bold leading-none">
            {hasValue(player.nickname) ? (
              <span className="text-orange-300">“{player.nickname}”</span>
            ) : null}

            {hasValue(player.nickname) &&
            (hasValue(player.position) || hasValue(player.role)) ? (
              <span className="text-zinc-600">•</span>
            ) : null}

            {hasValue(player.position) ? (
              <span className="text-zinc-400">{player.position}</span>
            ) : hasValue(player.role) ? (
              <span className="text-zinc-400">{player.role}</span>
            ) : (
              <span className="text-zinc-500">FACKTS Hoops</span>
            )}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-4 items-end gap-0">
          <MobileStat label="GP" value={player.games_played} />
          <MobileStat label="PPG" value={player.points_per_game} />
          <MobileStat label="RPG" value={player.rebounds_per_game} />
          <MobileStat label="APG" value={player.assists_per_game} />
        </div>
      </div>
    </Link>
  );
}

'@

$mobileStat = @'
function MobileStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 text-center">
      <div className="whitespace-nowrap text-[8px] font-black uppercase leading-none tracking-normal text-zinc-500">
        {label}
      </div>
      <div className="mt-1 whitespace-nowrap text-[13px] font-black leading-none tabular-nums text-zinc-100">
        {value}
      </div>
    </div>
  );
}

'@

$beforeMobile = $source.Substring(0, $mobileStart)
$desktopSection = $source.Substring($desktopStart, $mobileStatStart - $desktopStart)
$afterMobileStat = $source.Substring($heroStatStart)

$updated = $beforeMobile + $mobileRow + $desktopSection + $mobileStat + $afterMobileStat

$updatedMobileStart = $updated.IndexOf("function MobilePlayerRow({")
$updatedDesktopStart = $updated.IndexOf("function DesktopPlayerCard({")
$updatedMobileStatStart = $updated.IndexOf("function MobileStat({")
$updatedHeroStatStart = $updated.IndexOf("function HeroMiniStat({")

$dataLogicUnchanged =
  $updated.Substring(0, $updatedMobileStart) -ceq $beforeMobile

$desktopCardUnchanged =
  $updated.Substring(
    $updatedDesktopStart,
    $updatedMobileStatStart - $updatedDesktopStart
  ) -ceq $desktopSection

$remainingPageUnchanged =
  $updated.Substring($updatedHeroStatStart) -ceq $afterMobileStat

if (-not ($dataLogicUnchanged -and $desktopCardUnchanged -and $remainingPageUnchanged)) {
  Write-Host ""
  Write-Host "ERROR: Safety check failed. Nothing was changed." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path -LiteralPath $backup)) {
  Copy-Item -LiteralPath $target -Destination $backup
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)

Write-Host ""
Write-Host "SUCCESS: Mobile player rows updated." -ForegroundColor Green
Write-Host "Data query: UNCHANGED" -ForegroundColor Green
Write-Host "Desktop cards: UNCHANGED" -ForegroundColor Green
Write-Host "Animations: PRESERVED" -ForegroundColor Green
Write-Host ""
Write-Host "Refresh /players with Ctrl + Shift + R." -ForegroundColor Cyan

