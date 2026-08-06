$ErrorActionPreference = "Stop"

function Find-FacktsProjectRoot {
    param([string]$StartPath)

    $cursor = (Resolve-Path $StartPath).Path

    for ($index = 0; $index -lt 12; $index++) {
        $packageJson = Join-Path $cursor "package.json"
        $oneOnOneDetail = Join-Path $cursor "app\one-on-one\[id]\page.tsx"
        $guestList = Join-Path $cursor "app\guest-hoopers\page.tsx"

        if (
            (Test-Path -LiteralPath $packageJson) -and
            (Test-Path -LiteralPath $oneOnOneDetail) -and
            (Test-Path -LiteralPath $guestList)
        ) {
            return $cursor
        }

        $parent = Split-Path $cursor -Parent
        if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $cursor) {
            break
        }

        $cursor = $parent
    }

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-HIGHLIGHT-GUEST-PROFILES-V2.cmd again."
}

function Add-GuestProfileLink {
    param([string]$PageText)

    if ($PageText.Contains('href={`/guest-hoopers/${guest.id}`}')) {
        return $PageText
    }

    $guestCardStart = $PageText.IndexOf("function GuestCard(")
    if ($guestCardStart -lt 0) {
        throw "The GuestCard component was not found. Nothing was changed."
    }

    $nextFunctionStart = $PageText.IndexOf(
        "function ",
        $guestCardStart + "function GuestCard(".Length
    )

    if ($nextFunctionStart -lt 0) {
        $nextFunctionStart = $PageText.Length
    }

    $guestCardText = $PageText.Substring(
        $guestCardStart,
        $nextFunctionStart - $guestCardStart
    )

    $articleStart = $guestCardText.IndexOf("<article")
    $articleClose = $guestCardText.LastIndexOf("</article>")

    if ($articleStart -lt 0 -or $articleClose -lt 0) {
        throw "The GuestCard article wrapper was not found once. Nothing was changed."
    }

    $linkOpening = '<Link' + [Environment]::NewLine +
        '      href={`/guest-hoopers/${guest.id}`}'

    $guestCardText = $guestCardText.Remove(
        $articleStart,
        "<article".Length
    ).Insert($articleStart, $linkOpening)

    $articleClose = $guestCardText.LastIndexOf("</article>")
    $guestCardText = $guestCardText.Remove(
        $articleClose,
        "</article>".Length
    ).Insert($articleClose, "</Link>")

    $patched = $PageText.Remove(
        $guestCardStart,
        $nextFunctionStart - $guestCardStart
    ).Insert($guestCardStart, $guestCardText)

    if (-not $patched.Contains('import Link from "next/link";')) {
        $patched = 'import Link from "next/link";' +
            [Environment]::NewLine +
            $patched
    }

    if (-not $patched.Contains('href={`/guest-hoopers/${guest.id}`}')) {
        throw "The Guest Hooper profile link could not be verified. Nothing was changed."
    }

    return $patched
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot

$detailTarget = Join-Path $projectRoot "app\one-on-one\[id]\page.tsx"
$guestListTarget = Join-Path $projectRoot "app\guest-hoopers\page.tsx"
$guestProfileTarget = Join-Path $projectRoot "app\guest-hoopers\[id]\page.tsx"

$detailSource = Join-Path $PSScriptRoot "files\app\one-on-one\[id]\page.tsx"
$guestProfileSource = Join-Path $PSScriptRoot "files\app\guest-hoopers\[id]\page.tsx"

foreach ($source in @($detailSource, $guestProfileSource)) {
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Installer file is missing: $source"
    }
}

$detailText = [System.IO.File]::ReadAllText($detailTarget)
$guestListText = [System.IO.File]::ReadAllText($guestListTarget)

$detailInstalled = $detailText.Contains("function MatchMediaCard(")
$guestLinkInstalled = $guestListText.Contains(
    'href={`/guest-hoopers/${guest.id}`}'
)
$guestProfileInstalled =
    (Test-Path -LiteralPath $guestProfileTarget) -and
    ([System.IO.File]::ReadAllText($guestProfileTarget).Contains(
        "function parseProfileRouteId("
    ))

if ($detailInstalled -and $guestLinkInstalled -and $guestProfileInstalled) {
    Write-Host ""
    Write-Host "1v1 highlights and Guest Hooper profiles V2 are already installed." -ForegroundColor Green
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

$patchedGuestListText = $guestListText

if (-not $guestLinkInstalled) {
    if (
        -not $guestListText.Contains("function GuestCard(") -or
        -not $guestListText.Contains("guest={guest}")
    ) {
        throw "The current Guest Hoopers card component could not be identified safely. Nothing was changed."
    }

    $patchedGuestListText = Add-GuestProfileLink -PageText $guestListText
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

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)

if (-not $detailInstalled) {
    Copy-Item -LiteralPath $detailSource -Destination $detailTarget -Force
}

if (-not $guestLinkInstalled) {
    [System.IO.File]::WriteAllText(
        $guestListTarget,
        $patchedGuestListText,
        $utf8WithoutBom
    )
}

if (-not $guestProfileInstalled) {
    Copy-Item -LiteralPath $guestProfileSource -Destination $guestProfileTarget -Force
}

Write-Host ""
Write-Host "SUCCESS: 1v1 highlights and Guest Hooper profiles V2 are installed." -ForegroundColor Green
Write-Host ""
Write-Host "Changed when required:"
Write-Host "- app\one-on-one\[id]\page.tsx"
Write-Host "- app\guest-hoopers\page.tsx (existing list preserved)"
Write-Host "- app\guest-hoopers\[id]\page.tsx"
Write-Host ""
Write-Host "Both guest-* and player-* Guest Hooper profiles are supported."
Write-Host ""
Write-Host "Backup:"
Write-Host $backupRoot
Write-Host ""
Write-Host "Next: run npm run dev and test Hanss vs Hussein plus Guest Hooper cards from both sources."
