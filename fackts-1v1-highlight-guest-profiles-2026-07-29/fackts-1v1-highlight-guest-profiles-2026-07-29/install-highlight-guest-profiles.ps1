$ErrorActionPreference = "Stop"

function Find-FacktsProjectRoot {
    param([string]$StartPath)

    $cursor = (Resolve-Path $StartPath).Path

    for ($index = 0; $index -lt 12; $index++) {
        $packageJson = Join-Path $cursor "package.json"
        $oneOnOneDetail = Join-Path $cursor "app\one-on-one\[id]\page.tsx"
        $guestDirectory = Join-Path $cursor "app\guest-hoopers"

        if (
            (Test-Path -LiteralPath $packageJson) -and
            (Test-Path -LiteralPath $oneOnOneDetail) -and
            (Test-Path -LiteralPath $guestDirectory)
        ) {
            return $cursor
        }

        $parent = Split-Path $cursor -Parent
        if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $cursor) {
            break
        }

        $cursor = $parent
    }

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-HIGHLIGHT-GUEST-PROFILES.cmd again."
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot

$detailTarget = Join-Path $projectRoot "app\one-on-one\[id]\page.tsx"
$guestListTarget = Join-Path $projectRoot "app\guest-hoopers\page.tsx"
$guestProfileTarget = Join-Path $projectRoot "app\guest-hoopers\[id]\page.tsx"

$detailSource = Join-Path $PSScriptRoot "files\app\one-on-one\[id]\page.tsx"
$guestListSource = Join-Path $PSScriptRoot "files\app\guest-hoopers\page.tsx"
$guestProfileSource = Join-Path $PSScriptRoot "files\app\guest-hoopers\[id]\page.tsx"

foreach ($source in @($detailSource, $guestListSource, $guestProfileSource)) {
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Installer file is missing: $source"
    }
}

$detailText = [System.IO.File]::ReadAllText($detailTarget)
$guestListText = [System.IO.File]::ReadAllText($guestListTarget)

$detailInstalled = $detailText.Contains("function MatchMediaCard(")
$guestLinkInstalled = $guestListText.Contains('href={`/guest-hoopers/${guest.id}`}')
$guestProfileInstalled =
    (Test-Path -LiteralPath $guestProfileTarget) -and
    ([System.IO.File]::ReadAllText($guestProfileTarget).Contains("GuestHooperProfilePage"))

if ($detailInstalled -and $guestLinkInstalled -and $guestProfileInstalled) {
    Write-Host ""
    Write-Host "1v1 highlights and Guest Hooper profiles are already installed." -ForegroundColor Green
    Write-Host "No files were changed."
    exit 0
}

if (-not $detailInstalled) {
    if (
        -not $detailText.Contains("function getVideoUrl(row: OneOnOneRow)") -or
        -not $detailText.Contains("const videoUrl = getVideoUrl(row);")
    ) {
        throw "The current 1v1 detail page is different from the expected FACKTS version. Nothing was changed."
    }
}

if (-not $guestLinkInstalled) {
    if (
        -not $guestListText.Contains("{guestHoopers.map((guest: any) => (") -or
        -not $guestListText.Contains("<article")
    ) {
        throw "The current Guest Hoopers list is different from the expected FACKTS version. Nothing was changed."
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $PSScriptRoot "backup-before-install-$timestamp"

$backupDetail = Join-Path $backupRoot "app\one-on-one\[id]\page.tsx"
$backupGuestList = Join-Path $backupRoot "app\guest-hoopers\page.tsx"
$backupGuestProfile = Join-Path $backupRoot "app\guest-hoopers\[id]\page.tsx"

New-Item -ItemType Directory -Force -Path (Split-Path $backupDetail -Parent) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $backupGuestList -Parent) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $backupGuestProfile -Parent) | Out-Null

Copy-Item -LiteralPath $detailTarget -Destination $backupDetail -Force
Copy-Item -LiteralPath $guestListTarget -Destination $backupGuestList -Force

if (Test-Path -LiteralPath $guestProfileTarget) {
    Copy-Item -LiteralPath $guestProfileTarget -Destination $backupGuestProfile -Force
}

New-Item -ItemType Directory -Force -Path (Split-Path $guestProfileTarget -Parent) | Out-Null

Copy-Item -LiteralPath $detailSource -Destination $detailTarget -Force
Copy-Item -LiteralPath $guestListSource -Destination $guestListTarget -Force
Copy-Item -LiteralPath $guestProfileSource -Destination $guestProfileTarget -Force

Write-Host ""
Write-Host "SUCCESS: 1v1 highlights and Guest Hooper profiles are installed." -ForegroundColor Green
Write-Host ""
Write-Host "Changed:"
Write-Host "- app\one-on-one\[id]\page.tsx"
Write-Host "- app\guest-hoopers\page.tsx"
Write-Host "- app\guest-hoopers\[id]\page.tsx (new profile route)"
Write-Host ""
Write-Host "Backup:"
Write-Host $backupRoot
Write-Host ""
Write-Host "Next: run npm run dev and test Hanss vs Hussein plus two Guest Hooper cards."

