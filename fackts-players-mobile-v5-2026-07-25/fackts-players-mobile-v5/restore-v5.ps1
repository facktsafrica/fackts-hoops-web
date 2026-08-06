$ErrorActionPreference = "Stop"

$defaultProjectRoot = Join-Path $env:USERPROFILE "Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
$projectRoot = if ($env:FACKTS_PROJECT_ROOT) {
  $env:FACKTS_PROJECT_ROOT
} else {
  $defaultProjectRoot
}

$target = Join-Path $projectRoot "app\players\page.tsx"
$backup = Join-Path $projectRoot "app\players\page.tsx.before-v5"

if (-not (Test-Path -LiteralPath $backup)) {
  Write-Host ""
  Write-Host "ERROR: No V5 backup was found." -ForegroundColor Red
  exit 1
}

Copy-Item -LiteralPath $backup -Destination $target -Force

Write-Host ""
Write-Host "SUCCESS: The page was restored to its pre-V5 version." -ForegroundColor Green
Write-Host "Refresh /players with Ctrl + Shift + R." -ForegroundColor Cyan
