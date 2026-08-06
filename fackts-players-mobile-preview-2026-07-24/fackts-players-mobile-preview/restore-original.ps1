$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\user\Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
$TargetFile = Join-Path $ProjectRoot "app\players\page.tsx"
$BackupFile = Join-Path $ProjectRoot "app\players\page.before-mobile-preview.tsx"

if (-not (Test-Path $BackupFile)) {
    throw "No preview backup was found at: $BackupFile"
}

Copy-Item $BackupFile $TargetFile -Force

Write-Host ""
Write-Host "Original players page restored." -ForegroundColor Green
Write-Host "Restart npm run dev, then refresh /players."
