$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\user\Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
$sourceRoot = Join-Path $PSScriptRoot "files"
$baselineRoot = Join-Path $PSScriptRoot "baseline"

if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    Write-Host "The normal FACKTS project was not found at:" -ForegroundColor Yellow
    Write-Host $projectRoot
    $projectRoot = Read-Host "Paste the full path to fackts-hoops-web"
}

if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    Write-Host "STOPPED: That folder does not contain package.json." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $sourceRoot) -or -not (Test-Path $baselineRoot)) {
    Write-Host "STOPPED: The installer package is incomplete." -ForegroundColor Red
    exit 1
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-NormalizedText([string]$path) {
    $text = [System.IO.File]::ReadAllText($path)
    return $text.Replace("`r`n", "`n").Replace("`r", "`n")
}

function Same-NormalizedText([string]$left, [string]$right) {
    return (Read-NormalizedText $left) -ceq (Read-NormalizedText $right)
}

function Write-NormalizedCopy([string]$source, [string]$destination) {
    $parent = Split-Path $destination
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    [System.IO.File]::WriteAllText(
        $destination,
        (Read-NormalizedText $source),
        $utf8NoBom
    )
}

$sourceFiles = Get-ChildItem $sourceRoot -File -Recurse
$conflicts = New-Object System.Collections.Generic.List[string]

foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $target = Join-Path $projectRoot $relative
    $baseline = Join-Path $baselineRoot $relative

    if (-not (Test-Path $target) -or -not (Test-Path $baseline)) {
        $conflicts.Add($relative)
        continue
    }

    if (
        -not (Same-NormalizedText $target $baseline) -and
        -not (Same-NormalizedText $target $sourceFile.FullName)
    ) {
        $conflicts.Add($relative)
    }
}

if ($conflicts.Count -gt 0) {
    Write-Host ""
    Write-Host "STOPPED SAFELY: No FACKTS files were changed." -ForegroundColor Red
    Write-Host "These files differ from the expected version:" -ForegroundColor Yellow
    $conflicts | ForEach-Object { Write-Host " - $_" }
    Write-Host ""
    Write-Host "Your current local work is still untouched."
    exit 2
}

$backupRoot = Join-Path $projectRoot "fackts-mini-admin-fix-backups"
$backupPath = Join-Path $backupRoot (Get-Date -Format "yyyyMMdd-HHmmss")
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
[System.IO.File]::WriteAllText(
    (Join-Path $backupPath "project-root.txt"),
    $projectRoot,
    $utf8NoBom
)

foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $target = Join-Path $projectRoot $relative
    $backupTarget = Join-Path $backupPath $relative

    New-Item -ItemType Directory -Path (Split-Path $backupTarget) -Force |
        Out-Null
    Copy-Item -LiteralPath $target -Destination $backupTarget -Force
}

foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $target = Join-Path $projectRoot $relative
    Write-NormalizedCopy $sourceFile.FullName $target
}

[System.IO.File]::WriteAllText(
    (Join-Path $PSScriptRoot "last-backup.txt"),
    $backupPath,
    $utf8NoBom
)

Write-Host ""
Write-Host "SUCCESS: Mini Admin screen corrected safely." -ForegroundColor Green
Write-Host "Emails now come from Supabase Auth when the profile email is blank."
Write-Host "Blocked former admins are hidden until you choose Show blocked."
Write-Host "The new-account form will no longer autofill your saved login."
Write-Host "Backup: $backupPath"
Write-Host "Nothing was pushed and no SQL was run."
