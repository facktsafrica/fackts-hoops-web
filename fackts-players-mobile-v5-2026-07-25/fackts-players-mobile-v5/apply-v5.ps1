$ErrorActionPreference = "Stop"

$defaultProjectRoot = Join-Path $env:USERPROFILE "Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
$projectRoot = if ($env:FACKTS_PROJECT_ROOT) {
  $env:FACKTS_PROJECT_ROOT
} else {
  $defaultProjectRoot
}

$target = Join-Path $projectRoot "app\players\page.tsx"
$backup = Join-Path $projectRoot "app\players\page.tsx.before-v5"

if (-not (Test-Path -LiteralPath $target)) {
  Write-Host ""
  Write-Host "ERROR: Could not find app\players\page.tsx" -ForegroundColor Red
  Write-Host "Expected project: $projectRoot" -ForegroundColor Yellow
  exit 1
}

$source = [System.IO.File]::ReadAllText($target)

$mobileStart = $source.IndexOf("function MobilePlayerRow({")
$desktopStart = $source.IndexOf("function DesktopPlayerCard({")

if ($mobileStart -lt 0 -or $desktopStart -le $mobileStart) {
  Write-Host ""
  Write-Host "ERROR: The expected mobile player row was not found." -ForegroundColor Red
  Write-Host "Nothing was changed." -ForegroundColor Yellow
  exit 1
}

$beforeMobile = $source.Substring(0, $mobileStart)
$mobileSection = $source.Substring($mobileStart, $desktopStart - $mobileStart)
$afterMobile = $source.Substring($desktopStart)

$nicknamePattern = '<span className="text-orange-300">.*?\{player\.nickname\}.*?</span>'
$separatorPattern = '<span className="text-zinc-600">.*?</span>'

$singleline = [System.Text.RegularExpressions.RegexOptions]::Singleline

if ([regex]::Matches($mobileSection, $nicknamePattern, $singleline).Count -ne 1) {
  Write-Host ""
  Write-Host "ERROR: The mobile nickname line was not found exactly once." -ForegroundColor Red
  Write-Host "Nothing was changed." -ForegroundColor Yellow
  exit 1
}

if ([regex]::Matches($mobileSection, $separatorPattern, $singleline).Count -ne 1) {
  Write-Host ""
  Write-Host "ERROR: The mobile separator was not found exactly once." -ForegroundColor Red
  Write-Host "Nothing was changed." -ForegroundColor Yellow
  exit 1
}

$fixedMobile = [regex]::Replace(
  $mobileSection,
  $nicknamePattern,
  '<span className="text-orange-300">&quot;{player.nickname}&quot;</span>',
  $singleline
)
$fixedMobile = [regex]::Replace(
  $fixedMobile,
  $separatorPattern,
  '<span className="text-zinc-600">&bull;</span>',
  $singleline
)

$updated = $beforeMobile + $fixedMobile + $afterMobile

$updatedMobileStart = $updated.IndexOf("function MobilePlayerRow({")
$updatedDesktopStart = $updated.IndexOf("function DesktopPlayerCard({")

$outsideMobileUnchanged =
  $updated.Substring(0, $updatedMobileStart) -ceq $beforeMobile -and
  $updated.Substring($updatedDesktopStart) -ceq $afterMobile

$safeNicknamePresent =
  $fixedMobile.Contains('&quot;{player.nickname}&quot;')
$safeSeparatorPresent =
  $fixedMobile.Contains('&bull;')

if (-not ($outsideMobileUnchanged -and $safeNicknamePresent -and $safeSeparatorPresent)) {
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
Write-Host "SUCCESS: Funny characters removed." -ForegroundColor Green
Write-Host "Mobile layout: UNCHANGED" -ForegroundColor Green
Write-Host "Data query: UNCHANGED" -ForegroundColor Green
Write-Host "Desktop cards: UNCHANGED" -ForegroundColor Green
Write-Host ""
Write-Host "Refresh /players with Ctrl + Shift + R." -ForegroundColor Cyan
