$ErrorActionPreference = "Stop"

function Find-FacktsProjectRoot {
    param([string]$StartPath)

    $cursor = (Resolve-Path $StartPath).Path

    for ($index = 0; $index -lt 12; $index++) {
        $packageJson = Join-Path $cursor "package.json"
        $oneOnOnePage = Join-Path $cursor "app\one-on-one\page.tsx"

        if ((Test-Path $packageJson) -and (Test-Path $oneOnOnePage)) {
            return $cursor
        }

        $parent = Split-Path $cursor -Parent
        if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $cursor) {
            break
        }

        $cursor = $parent
    }

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-1V1-DATE-NAME-SIZE-9-V2.cmd again."
}

function Set-MobileFontSizeToNine {
    param(
        [string]$Classes,
        [string]$Label
    )

    $mobileTextSizePattern = '(?<![:A-Za-z0-9_-])text-(?:\[(?:\d+(?:\.\d+)?)px\]|xs|sm|base|lg|xl|[2-9]xl)'
    $matches = [regex]::Matches($Classes, $mobileTextSizePattern)

    if ($matches.Count -ne 1) {
        throw "Could not safely identify exactly one mobile font-size class for $Label. Nothing was changed."
    }

    return [regex]::Replace($Classes, $mobileTextSizePattern, 'text-[9px]', 1)
}

function Get-MobileFontSizeCount {
    param([string]$Classes)

    return [regex]::Matches(
        $Classes,
        '(?<![:A-Za-z0-9_-])text-\[9px\]'
    ).Count
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\one-on-one\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

# These patterns identify the intended JSX by the rendered content, not by one
# fragile full Tailwind class string. This lets the installer preserve every
# earlier 1v1 layout and typography fix.
$datePattern = '(?s)<(?<tag>p|span)\s+className="(?<classes>[^"]*)">\s*(?<body>\{formatFixtureDate\(displayDate\)\}\s*\u00B7\s*\{formatFixtureTime\(displayDate\)\}\s*)</\k<tag>>'
$namePattern = '(?s)<(?<tag>p|span)(?<gap>\s+)className=\{`(?<classes>[^`]*)`\}\s*>\s*(?<body>\{identity\.name\}\s*)</\k<tag>>'

$dateMatches = [regex]::Matches($content, $datePattern)
$nameMatches = [regex]::Matches($content, $namePattern)

if ($dateMatches.Count -ne 1) {
    throw "The mobile 1v1 date/time element was not found exactly once. Nothing was changed."
}

if ($nameMatches.Count -ne 1) {
    throw "The 1v1 player-name element was not found exactly once. Nothing was changed."
}

$dateMatch = $dateMatches[0]
$nameMatch = $nameMatches[0]

$dateClasses = Set-MobileFontSizeToNine `
    -Classes $dateMatch.Groups["classes"].Value `
    -Label "the match date"

$nameClasses = Set-MobileFontSizeToNine `
    -Classes $nameMatch.Groups["classes"].Value `
    -Label "the player name"

$dateReplacement = (
    '<span className="' +
    $dateClasses +
    '">' +
    $dateMatch.Groups["body"].Value +
    '</span>'
)

$nameReplacement = (
    '<span' +
    $nameMatch.Groups["gap"].Value +
    'className={`' +
    $nameClasses +
    '`}>' +
    $nameMatch.Groups["body"].Value +
    '</span>'
)

$updated = $content
$updated = $updated.Remove($nameMatch.Index, $nameMatch.Length).Insert(
    $nameMatch.Index,
    $nameReplacement
)
$updated = $updated.Remove($dateMatch.Index, $dateMatch.Length).Insert(
    $dateMatch.Index,
    $dateReplacement
)

$verifiedDateMatches = [regex]::Matches($updated, $datePattern)
$verifiedNameMatches = [regex]::Matches($updated, $namePattern)

if ($verifiedDateMatches.Count -ne 1 -or $verifiedNameMatches.Count -ne 1) {
    throw "Safety verification failed before writing. Nothing was changed."
}

$verifiedDate = $verifiedDateMatches[0]
$verifiedName = $verifiedNameMatches[0]

if (
    $verifiedDate.Groups["tag"].Value -ne "span" -or
    $verifiedName.Groups["tag"].Value -ne "span" -or
    (Get-MobileFontSizeCount -Classes $verifiedDate.Groups["classes"].Value) -ne 1 -or
    (Get-MobileFontSizeCount -Classes $verifiedName.Groups["classes"].Value) -ne 1
) {
    throw "The 9px verification failed before writing. Nothing was changed."
}

if ($updated -eq $content) {
    Write-Host ""
    Write-Host "1v1 date and player-name size 9 V2 is already installed." -ForegroundColor Green
    Write-Host "No files were changed."
    exit 0
}

$backupDirectory = Join-Path $projectRoot "fackts-one-on-one-date-name-size-9-backups"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupDirectory "page.tsx.$timestamp.bak"
Copy-Item -Path $target -Destination $backup

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)

Write-Host ""
Write-Host "1V1 DATE + PLAYER NAME SIZE 9 V2 INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\one-on-one\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "Updated on mobile:"
Write-Host "  - match date/time now renders at exactly 9px"
Write-Host "  - player names now render at exactly 9px"
Write-Host "  - the global paragraph rule cannot enlarge either line"
Write-Host ""
Write-Host "Preserved:"
Write-Host "  - position sentence case, size and boldness"
Write-Host "  - COMPLETED, cards, scores, photos, spacing and desktop styling"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Run npm run dev"
Write-Host "  2. Open http://localhost:3000/one-on-one in phone view"
Write-Host "  3. Hard-refresh and send a screenshot before pushing"
Write-Host ""
Write-Host "Do not push until the page has been checked."
