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

$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCommand) {
    Write-Host "STOPPED: Git is required for the safe merge." -ForegroundColor Red
    exit 1
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-NormalizedText([string]$path) {
    $text = [System.IO.File]::ReadAllText($path)
    return $text.Replace("`r`n", "`n").Replace("`r", "`n")
}

function Write-NormalizedCopy([string]$source, [string]$destination) {
    $parent = Split-Path $destination
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    $text = Read-NormalizedText $source
    [System.IO.File]::WriteAllText($destination, $text, $utf8NoBom)
}

function Same-NormalizedText([string]$left, [string]$right) {
    return (Read-NormalizedText $left) -ceq (Read-NormalizedText $right)
}

$workingRoot = Join-Path ([System.IO.Path]::GetTempPath()) (
    "fackts-admin-dashboard-" + [System.Guid]::NewGuid().ToString("N")
)
$stagingRoot = Join-Path $workingRoot "staged"
$mergeRoot = Join-Path $workingRoot "merge"
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null
New-Item -ItemType Directory -Path $mergeRoot -Force | Out-Null

$sourceFiles = Get-ChildItem $sourceRoot -File -Recurse
$conflicts = New-Object System.Collections.Generic.List[string]
$fileNumber = 0

foreach ($sourceFile in $sourceFiles) {
    $fileNumber += 1
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $target = Join-Path $projectRoot $relative
    $baseline = Join-Path $baselineRoot $relative
    $staged = Join-Path $stagingRoot $relative

    if (-not (Test-Path $target)) {
        Write-NormalizedCopy $sourceFile.FullName $staged
        continue
    }

    if (-not (Test-Path $baseline)) {
        if (Same-NormalizedText $target $sourceFile.FullName) {
            Write-NormalizedCopy $sourceFile.FullName $staged
        } else {
            $conflicts.Add($relative)
        }
        continue
    }

    if (Same-NormalizedText $target $sourceFile.FullName) {
        Write-NormalizedCopy $sourceFile.FullName $staged
        continue
    }

    if (Same-NormalizedText $target $baseline) {
        Write-NormalizedCopy $sourceFile.FullName $staged
        continue
    }

    if (Same-NormalizedText $sourceFile.FullName $baseline) {
        Write-NormalizedCopy $target $staged
        continue
    }

    $localTemp = Join-Path $mergeRoot ("local-" + $fileNumber + ".txt")
    $baseTemp = Join-Path $mergeRoot ("base-" + $fileNumber + ".txt")
    $upgradeTemp = Join-Path $mergeRoot ("upgrade-" + $fileNumber + ".txt")

    Write-NormalizedCopy $target $localTemp
    Write-NormalizedCopy $baseline $baseTemp
    Write-NormalizedCopy $sourceFile.FullName $upgradeTemp

    & $gitCommand.Source merge-file $localTemp $baseTemp $upgradeTemp 2>$null
    $mergeExit = $LASTEXITCODE

    if ($mergeExit -eq 0) {
        $stagedParent = Split-Path $staged
        New-Item -ItemType Directory -Path $stagedParent -Force | Out-Null
        Copy-Item -LiteralPath $localTemp -Destination $staged -Force
    } else {
        $conflicts.Add($relative)
    }
}

if ($conflicts.Count -gt 0) {
    Write-Host ""
    Write-Host "STOPPED SAFELY: No FACKTS files were changed." -ForegroundColor Red
    Write-Host "These files need a manual merge:" -ForegroundColor Yellow
    $conflicts | ForEach-Object { Write-Host " - $_" }
    Write-Host ""
    Write-Host "Your current local work is still untouched."
    Remove-Item -LiteralPath $workingRoot -Recurse -Force
    exit 2
}

$backupRoot = Join-Path $projectRoot "fackts-admin-upgrade-backups"
$backupPath = Join-Path $backupRoot (Get-Date -Format "yyyyMMdd-HHmmss")
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
[System.IO.File]::WriteAllText(
    (Join-Path $backupPath "project-root.txt"),
    $projectRoot,
    $utf8NoBom
)

$newFiles = New-Object System.Collections.Generic.List[string]

foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $target = Join-Path $projectRoot $relative

    if (Test-Path $target) {
        $backupTarget = Join-Path $backupPath $relative
        New-Item -ItemType Directory -Path (Split-Path $backupTarget) -Force |
            Out-Null
        Copy-Item -LiteralPath $target -Destination $backupTarget -Force
    } else {
        $newFiles.Add($relative)
    }
}

[System.IO.File]::WriteAllLines(
    (Join-Path $backupPath "new-files.txt"),
    $newFiles,
    $utf8NoBom
)

foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $staged = Join-Path $stagingRoot $relative
    $target = Join-Path $projectRoot $relative
    New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
    Copy-Item -LiteralPath $staged -Destination $target -Force
}

[System.IO.File]::WriteAllText(
    (Join-Path $PSScriptRoot "last-backup.txt"),
    $backupPath,
    $utf8NoBom
)

Remove-Item -LiteralPath $workingRoot -Recurse -Force

Write-Host ""
Write-Host "SUCCESS: FACKTS admin dashboard upgrade merged safely." -ForegroundColor Green
Write-Host "Mini Admin management is now provisioned in the dashboard."
Write-Host "Add the new person later from Admin > Mini Admins."
Write-Host "Backup: $backupPath"
Write-Host "Nothing was pushed and no SQL was run."
