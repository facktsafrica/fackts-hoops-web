$ErrorActionPreference = "Stop"

$marker = Join-Path $PSScriptRoot "last-backup.txt"
$sourceRoot = Join-Path $PSScriptRoot "files"

if (-not (Test-Path $marker)) {
    Write-Host "STOPPED: No backup marker was found. Nothing was changed." -ForegroundColor Red
    exit 1
}

$backupPath = (Get-Content -LiteralPath $marker -Raw).Trim()
$projectFile = Join-Path $backupPath "project-root.txt"
$newFilesFile = Join-Path $backupPath "new-files.txt"

if (-not (Test-Path $projectFile)) {
    Write-Host "STOPPED: The backup is incomplete. Nothing was changed." -ForegroundColor Red
    exit 1
}

$projectRoot = (Get-Content -LiteralPath $projectFile -Raw).Trim()
$newFiles = @()

if (Test-Path $newFilesFile) {
    $newFiles = Get-Content -LiteralPath $newFilesFile |
        Where-Object { $_ -and $_.Trim().Length -gt 0 }
}

foreach ($sourceFile in (Get-ChildItem $sourceRoot -File -Recurse)) {
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $target = Join-Path $projectRoot $relative
    $backupTarget = Join-Path $backupPath $relative

    if (Test-Path $backupTarget) {
        New-Item -ItemType Directory -Path (Split-Path $target) -Force |
            Out-Null
        Copy-Item -LiteralPath $backupTarget -Destination $target -Force
    } elseif ($newFiles -contains $relative) {
        if (Test-Path $target) {
            Remove-Item -LiteralPath $target -Force
        }
    }
}

Write-Host ""
Write-Host "SUCCESS: Local files restored to their pre-upgrade state." -ForegroundColor Green
Write-Host "The already-installed Supabase SQL remains in place."
