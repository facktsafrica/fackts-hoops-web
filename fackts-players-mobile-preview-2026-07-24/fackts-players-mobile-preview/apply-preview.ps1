$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\user\Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
$TargetFile = Join-Path $ProjectRoot "app\players\page.tsx"
$BackupFile = Join-Path $ProjectRoot "app\players\page.before-mobile-preview.tsx"
$PreviewFile = Join-Path $PSScriptRoot "app\players\page.tsx"

if (-not (Test-Path $TargetFile)) {
    throw "Could not find the FACKTS players page at: $TargetFile"
}

if (-not (Test-Path $PreviewFile)) {
    throw "The preview replacement file is missing: $PreviewFile"
}

if (-not (Test-Path $BackupFile)) {
    Copy-Item $TargetFile $BackupFile
}

Copy-Item $PreviewFile $TargetFile -Force

Write-Host ""
Write-Host "Players mobile preview applied successfully." -ForegroundColor Green
Write-Host "Only app\players\page.tsx was changed."
Write-Host "Your original file is backed up as:"
Write-Host $BackupFile
Write-Host ""
Write-Host "Now run npm run dev in your normal fackts-hoops-web folder."
