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

    throw "FACKTS project not found. Move this extracted folder inside fackts-hoops-web, then run APPLY-1V1-POSITION-SIZE-CORRECTION.cmd again."
}

$projectRoot = Find-FacktsProjectRoot -StartPath $PSScriptRoot
$target = Join-Path $projectRoot "app\one-on-one\page.tsx"
$content = [System.IO.File]::ReadAllText($target)

$oldClass = 'mt-1 truncate text-[7px] font-black leading-none tracking-[0.01em] text-slate-500 sm:mt-0.5 sm:text-[8px] sm:font-black sm:tracking-[0.04em]'
$newClass = 'mt-1 block truncate text-[7px] font-black leading-none tracking-[0.01em] text-slate-500 sm:mt-0.5 sm:text-[8px] sm:font-black sm:tracking-[0.04em]'
$positionValue = '{toSentenceCase(identity.position || identity.type.replace("_", " "))}'

$oldOpening = '<p className="' + $oldClass + '">'
$newOpening = '<span className="' + $newClass + '">'

$oldPattern = [regex]::Escape($oldOpening) +
    '(?<middle>\s*' + [regex]::Escape($positionValue) + '\s*)' +
    [regex]::Escape('</p>')

$newPattern = [regex]::Escape($newOpening) +
    '(?<middle>\s*' + [regex]::Escape($positionValue) + '\s*)' +
    [regex]::Escape('</span>')

$oldMatches = [regex]::Matches($content, $oldPattern)
$newMatches = [regex]::Matches($content, $newPattern)

if ($newMatches.Count -eq 1 -and $oldMatches.Count -eq 0) {
    Write-Host ""
    Write-Host "1v1 position size correction is already installed." -ForegroundColor Green
    Write-Host "No files were changed."
    exit 0
}

if ($oldMatches.Count -ne 1) {
    throw "The exact current player-position line was not found once. Nothing was changed. Make sure the earlier 1v1 position fix is installed."
}

$backupDirectory = Join-Path $projectRoot "fackts-one-on-one-position-size-correction-backups"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupDirectory "page.tsx.$timestamp.bak"
Copy-Item -Path $target -Destination $backup

$positionRegex = New-Object System.Text.RegularExpressions.Regex($oldPattern)
$updated = $positionRegex.Replace(
    $content,
    [System.Text.RegularExpressions.MatchEvaluator] {
        param($match)
        return $newOpening + $match.Groups["middle"].Value + "</span>"
    },
    1
)

if (
    [regex]::Matches($updated, $newPattern).Count -ne 1 -or
    [regex]::Matches($updated, $oldPattern).Count -ne 0
) {
    throw "Safety verification failed. The original page remains available at $backup."
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)

Write-Host ""
Write-Host "1V1 POSITION SIZE CORRECTION INSTALLED" -ForegroundColor Green
Write-Host ""
Write-Host "Changed only: app\one-on-one\page.tsx"
Write-Host "Backup saved: $backup"
Write-Host ""
Write-Host "Corrected:"
Write-Host "  - position letters now render at the same actual mobile size as COMPLETED"
Write-Host "  - position boldness and sentence case were preserved"
Write-Host "  - player names, cards, photos, scores and spacing were untouched"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Run npm run dev"
Write-Host "  2. Open http://localhost:3000/one-on-one in phone view"
Write-Host "  3. Hard-refresh and send a screenshot before pushing"
Write-Host ""
Write-Host "Do not push until the page has been checked."
