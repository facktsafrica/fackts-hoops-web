$ErrorActionPreference = "Stop"

function Find-FacktsProjectRoot {
    param([string]$StartPath)

    $cursor = (Resolve-Path $StartPath).Path

    for ($index = 0; $index -lt 7; $index++) {
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

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-1V1-DATE-NAME-SIZE-9.cmd again."
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\one-on-one\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

$oldDateClass = 'shrink-0 whitespace-nowrap text-right text-[7px] font-black uppercase tracking-[-0.01em] text-blue-100 sm:text-[9px] sm:tracking-[0.04em]'
$newDateClass = 'shrink-0 whitespace-nowrap text-right text-[9px] font-black uppercase leading-none tracking-[-0.01em] text-blue-100 sm:tracking-[0.04em]'
$oldDateOpening = '<p className="' + $oldDateClass + '">'
$newDateOpening = '<span className="' + $newDateClass + '">'

$oldNameClass = 'line-clamp-2 min-h-[17px] text-[7px] font-bold uppercase leading-[8.5px] tracking-[0.015em] sm:min-h-0 sm:text-xs sm:font-black sm:leading-3.5 sm:tracking-[0.02em]'
$newNameClass = 'line-clamp-2 min-h-[21px] text-[9px] font-bold uppercase leading-[10.5px] tracking-[0.015em] sm:min-h-0 sm:text-xs sm:font-black sm:leading-3.5 sm:tracking-[0.02em]'

$dateBodyPattern = '(?<body>\s*\{formatFixtureDate\(displayDate\)\} · \{formatFixtureTime\(displayDate\)\}\s*)'
$oldDatePattern = [regex]::Escape($oldDateOpening) + $dateBodyPattern + [regex]::Escape('</p>')
$newDatePattern = [regex]::Escape($newDateOpening) + $dateBodyPattern + [regex]::Escape('</span>')

$oldNameOpeningPattern = [regex]::Escape('<p') +
    '(?<gap>\s+)' +
    [regex]::Escape('className={`' + $oldNameClass + ' ${')

$newNameOpeningPattern = [regex]::Escape('<span') +
    '(?<gap>\s+)' +
    [regex]::Escape('className={`' + $newNameClass + ' ${')

$oldNameClosingPattern = '(?<body>\{identity\.name\}\s*)' + [regex]::Escape('</p>')
$newNameClosingPattern = '(?<body>\{identity\.name\}\s*)' + [regex]::Escape('</span>')

$oldDateMatches = [regex]::Matches($content, $oldDatePattern)
$newDateMatches = [regex]::Matches($content, $newDatePattern)
$oldNameOpeningMatches = [regex]::Matches($content, $oldNameOpeningPattern)
$newNameOpeningMatches = [regex]::Matches($content, $newNameOpeningPattern)
$oldNameClosingMatches = [regex]::Matches($content, $oldNameClosingPattern)
$newNameClosingMatches = [regex]::Matches($content, $newNameClosingPattern)

$alreadyInstalled = (
    $newDateMatches.Count -eq 1 -and
    $newNameOpeningMatches.Count -eq 1 -and
    $newNameClosingMatches.Count -eq 1 -and
    $oldDateMatches.Count -eq 0 -and
    $oldNameOpeningMatches.Count -eq 0 -and
    $oldNameClosingMatches.Count -eq 0
)

if ($alreadyInstalled) {
    Write-Host ""
    Write-Host "1v1 date and player-name size 9 is already installed." -ForegroundColor Green
    Write-Host "No files were changed."
    exit 0
}

if (
    $oldDateMatches.Count -ne 1 -or
    $oldNameOpeningMatches.Count -ne 1 -or
    $oldNameClosingMatches.Count -ne 1
) {
    throw "The exact current 1v1 date/name styling was not found once. Nothing was changed. Make sure all earlier 1v1 typography and position fixes are installed."
}

$backupDirectory = Join-Path $projectRoot "fackts-one-on-one-date-name-size-9-backups"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupDirectory "page.tsx.$timestamp.bak"
Copy-Item -Path $target -Destination $backup

$dateRegex = New-Object System.Text.RegularExpressions.Regex($oldDatePattern)
$updated = $dateRegex.Replace(
    $content,
    [System.Text.RegularExpressions.MatchEvaluator] {
        param($match)
        return $newDateOpening + $match.Groups["body"].Value + "</span>"
    },
    1
)

$nameOpeningRegex = New-Object System.Text.RegularExpressions.Regex($oldNameOpeningPattern)
$updated = $nameOpeningRegex.Replace(
    $updated,
    [System.Text.RegularExpressions.MatchEvaluator] {
        param($match)
        return '<span' + $match.Groups["gap"].Value + 'className={`' + $newNameClass + ' ${'
    },
    1
)

$nameClosingRegex = New-Object System.Text.RegularExpressions.Regex($oldNameClosingPattern)
$updated = $nameClosingRegex.Replace(
    $updated,
    [System.Text.RegularExpressions.MatchEvaluator] {
        param($match)
        return $match.Groups["body"].Value + "</span>"
    },
    1
)

if (
    [regex]::Matches($updated, $newDatePattern).Count -ne 1 -or
    [regex]::Matches($updated, $newNameOpeningPattern).Count -ne 1 -or
    [regex]::Matches($updated, $newNameClosingPattern).Count -ne 1 -or
    [regex]::Matches($updated, $oldDatePattern).Count -ne 0 -or
    [regex]::Matches($updated, $oldNameOpeningPattern).Count -ne 0 -or
    [regex]::Matches($updated, $oldNameClosingPattern).Count -ne 0
) {
    throw "Safety verification failed. The original page remains available at $backup."
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)

Write-Host ""
Write-Host "1V1 DATE + PLAYER NAME SIZE 9 INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\one-on-one\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "Updated on mobile:"
Write-Host "  - match dates now render at exactly 9px"
Write-Host "  - player names now render at exactly 9px"
Write-Host "  - global paragraph sizing can no longer enlarge either line"
Write-Host "  - cards, positions, COMPLETED, scores, photos and desktop styling were untouched"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Run npm run dev"
Write-Host "  2. Open http://localhost:3000/one-on-one in phone view"
Write-Host "  3. Hard-refresh and send a screenshot before pushing"
Write-Host ""
Write-Host "Do not push until the page has been checked."

