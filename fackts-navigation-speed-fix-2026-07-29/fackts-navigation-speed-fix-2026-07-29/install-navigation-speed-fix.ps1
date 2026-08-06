$ErrorActionPreference = "Stop"

function Find-FacktsProjectRoot {
    $current = Get-Item -LiteralPath $PSScriptRoot

    while ($null -ne $current) {
        $packageJson = Join-Path $current.FullName "package.json"
        $appDirectory = Join-Path $current.FullName "app"

        if ((Test-Path -LiteralPath $packageJson) -and (Test-Path -LiteralPath $appDirectory)) {
            return $current.FullName
        }

        $current = $current.Parent
    }

    throw "Could not find the fackts-hoops-web project. Extract this folder anywhere inside the project, then run the installer again."
}

$projectRoot = Find-FacktsProjectRoot
$oldCachePattern = 'export const dynamic = "force-dynamic";\r?\nexport const revalidate = 0;'
$newCacheSetting = 'export const revalidate = 60;'

$publicPages = @(
    "app/page.tsx",
    "app/events/page.tsx",
    "app/games/page.tsx",
    "app/games/[id]/page.tsx",
    "app/one-on-one/page.tsx",
    "app/guest-hoopers/page.tsx",
    "app/guest-hoopers/[id]/page.tsx",
    "app/guest-leaderboards/page.tsx",
    "app/leaderboards/page.tsx",
    "app/media/page.tsx",
    "app/partners/page.tsx",
    "app/partners/[id]/page.tsx",
    "app/players/[id]/page.tsx",
    "app/rosters/page.tsx",
    "app/rosters/[gameId]/page.tsx"
)

$plannedChanges = @()

foreach ($relativePath in $publicPages) {
    $absolutePath = Join-Path $projectRoot $relativePath

    if (-not (Test-Path -LiteralPath $absolutePath)) {
        throw "Required FACKTS file was not found: $relativePath. Nothing was changed."
    }

    $content = Get-Content -LiteralPath $absolutePath -Raw
    $oldMatches = [regex]::Matches($content, $oldCachePattern).Count
    $newMatches = [regex]::Matches($content, 'export const revalidate = 60;').Count

    if ($oldMatches -eq 1) {
        $updatedContent = [regex]::Replace($content, $oldCachePattern, $newCacheSetting, 1)
        $plannedChanges += [pscustomobject]@{
            RelativePath = $relativePath
            AbsolutePath = $absolutePath
            Content = $updatedContent
        }
        continue
    }

    if ($oldMatches -eq 0 -and $newMatches -eq 1 -and $content -notmatch 'export const dynamic = "force-dynamic";') {
        continue
    }

    throw "The cache settings in $relativePath are different from the expected FACKTS version. Nothing was changed."
}

$detailRelativePath = "app/one-on-one/[id]/page.tsx"
$detailAbsolutePath = Join-Path $projectRoot $detailRelativePath

if (-not (Test-Path -LiteralPath $detailAbsolutePath)) {
    throw "Required FACKTS file was not found: $detailRelativePath. Nothing was changed."
}

$detailContent = Get-Content -LiteralPath $detailAbsolutePath -Raw
$detailCacheMatches = [regex]::Matches($detailContent, 'export const revalidate = 60;').Count

if ($detailCacheMatches -eq 0) {
    $importPattern = '(import AnimatedNumber from "@/app/components/AnimatedNumber";\r?\n)'
    $importMatches = [regex]::Matches($detailContent, $importPattern).Count

    if ($importMatches -ne 1) {
        throw "The 1v1 detail page structure is different from the expected FACKTS version. Nothing was changed."
    }

    $detailUpdatedContent = [regex]::Replace(
        $detailContent,
        $importPattern,
        '${1}' + [Environment]::NewLine + $newCacheSetting + [Environment]::NewLine,
        1
    )

    $plannedChanges += [pscustomobject]@{
        RelativePath = $detailRelativePath
        AbsolutePath = $detailAbsolutePath
        Content = $detailUpdatedContent
    }
}
elseif ($detailCacheMatches -ne 1) {
    throw "The 1v1 detail page has unexpected cache settings. Nothing was changed."
}

if ($plannedChanges.Count -eq 0) {
    Write-Host ""
    Write-Host "FACKTS navigation speed fix is already installed." -ForegroundColor Green
    Write-Host "No files needed changing."
    exit 0
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $projectRoot "fackts-navigation-speed-fix-backups\$timestamp"

foreach ($change in $plannedChanges) {
    $backupPath = Join-Path $backupRoot $change.RelativePath
    $backupDirectory = Split-Path -Parent $backupPath
    New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
    Copy-Item -LiteralPath $change.AbsolutePath -Destination $backupPath
}

foreach ($change in $plannedChanges) {
    [System.IO.File]::WriteAllText(
        $change.AbsolutePath,
        $change.Content,
        [System.Text.UTF8Encoding]::new($false)
    )
}

Write-Host ""
Write-Host "SUCCESS: FACKTS navigation speed fix installed." -ForegroundColor Green
Write-Host "Changed only public-page cache settings."
Write-Host "Public pages now refresh in the background every 60 seconds."
Write-Host "Backup saved at: $backupRoot"
Write-Host ""
Write-Host "Next: run npm run build. Do not push until the build passes."
