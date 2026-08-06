$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\user\Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
$sourceRoot = Join-Path $PSScriptRoot "files"

if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    Write-Host "The normal FACKTS project was not found at:" -ForegroundColor Yellow
    Write-Host $projectRoot
    $projectRoot = Read-Host "Paste the full path to fackts-hoops-web"
}

if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    Write-Host "STOPPED: That folder does not contain package.json." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $sourceRoot)) {
    Write-Host "STOPPED: The upgrade files folder is missing." -ForegroundColor Red
    exit 1
}

$expectedHashes = @{
    "app\admin\layout.tsx" = "d89e06e2ec7eb7bfe602b60ca4725b52de6b819628321cc86741f7936dc854de"
    "app\admin\page.tsx" = "b7fd85c4965f995216875ae1109d01395b3d9d91212f124d3d0138a5684f4280"
    "app\admin\notifications\page.tsx" = "d86501fa99aa09e5c11c3dd49eb4fd4d6c37b8b5e34f9e3a3e5bbc8ca5fab564"
    "app\api\notification-events\route.ts" = "142bf6f6dff01e68160658ee09c8b323704abb2700da995febb83a418d23f08b"
    "app\api\push\subscribe\route.ts" = "6b50fe8852b33baacb4b57c602bd8ac437f5d0bb2694ce960ce2d986352b6b3a"
    "app\components\PushNotificationManager.tsx" = "b5fa51ce106b201225be8e5a4dc91a1926ea608df711f755e674bf9743a97e88"
    "lib\auth\server.ts" = "74c03145539403ef864ff31b1e30e73dcf68c634f2e0b8b5c1ee2ce637992135"
    "lib\notifications\server.ts" = "2de891c90297781edfea483ec2e79b10d57e1bc8c69e84065517d6dd62b38716"
    "public\sw.js" = "43acdf48d718bb744888acf20415e897697886ce8fe97c5128a55906b899185a"
    "app\player\page.tsx" = "a2cab796017e6cdf71c34d200558dcd893726c4b94a361d7f307092a0461abe9"
    "app\api\admin\email\route.ts" = "0aecaa5946da6aa2ce22c573685faa2b5c31afae7c7bc1269e8777509202e1f5"
    "app\api\admin\player-access\route.ts" = "c62dd65d4a5360afc4851bbe12677ab9bd8c13bdf733a1caf48a6c88ba5da4e8"
}

$sourceFiles = Get-ChildItem $sourceRoot -File -Recurse
$conflicts = @()
$alreadyInstalled = 0

foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $target = Join-Path $projectRoot $relative
    $sourceHash = (Get-FileHash $sourceFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()

    if (Test-Path $target) {
        $targetHash = (Get-FileHash $target -Algorithm SHA256).Hash.ToLowerInvariant()

        if ($targetHash -eq $sourceHash) {
            $alreadyInstalled += 1
            continue
        }

        if ($expectedHashes.ContainsKey($relative)) {
            if ($targetHash -ne $expectedHashes[$relative]) {
                $conflicts += $relative
            }
        } else {
            $conflicts += $relative
        }
    } elseif ($expectedHashes.ContainsKey($relative)) {
        $conflicts += "$relative (expected file is missing)"
    }
}

if ($conflicts.Count -gt 0) {
    Write-Host ""
    Write-Host "STOPPED SAFELY: No files were changed." -ForegroundColor Red
    Write-Host "These local files differ from the expected FACKTS version:" -ForegroundColor Yellow
    $conflicts | ForEach-Object { Write-Host " - $_" }
    Write-Host ""
    Write-Host "Keep your local work. Send this screen before applying anything."
    exit 2
}

if ($alreadyInstalled -eq $sourceFiles.Count) {
    Write-Host "SUCCESS: The admin upgrade is already installed locally." -ForegroundColor Green
    exit 0
}

$backupRoot = Join-Path $projectRoot "fackts-admin-upgrade-backups"
$backupPath = Join-Path $backupRoot (Get-Date -Format "yyyyMMdd-HHmmss")
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
Set-Content -LiteralPath (Join-Path $backupPath "project-root.txt") -Value $projectRoot -Encoding UTF8

$newFiles = @()

foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $target = Join-Path $projectRoot $relative

    if (Test-Path $target) {
        $backupTarget = Join-Path $backupPath $relative
        New-Item -ItemType Directory -Path (Split-Path $backupTarget) -Force | Out-Null
        Copy-Item -LiteralPath $target -Destination $backupTarget -Force
    } else {
        $newFiles += $relative
    }
}

Set-Content -LiteralPath (Join-Path $backupPath "new-files.txt") -Value $newFiles -Encoding UTF8

foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($sourceRoot.Length).TrimStart("\")
    $target = Join-Path $projectRoot $relative
    New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
    Copy-Item -LiteralPath $sourceFile.FullName -Destination $target -Force
}

Set-Content -LiteralPath (Join-Path $PSScriptRoot "last-backup.txt") -Value $backupPath -Encoding UTF8

Write-Host ""
Write-Host "SUCCESS: FACKTS admin upgrade applied locally." -ForegroundColor Green
Write-Host "Backup: $backupPath"
Write-Host "Nothing was pushed and no SQL was run automatically."
