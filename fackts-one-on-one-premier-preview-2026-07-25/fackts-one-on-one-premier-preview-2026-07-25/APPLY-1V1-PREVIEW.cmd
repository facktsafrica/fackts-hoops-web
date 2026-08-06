@echo off
setlocal

set "TARGET=C:\Users\user\Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web\app\one-on-one\page.tsx"
set "BACKUP=%TARGET%.before-premier-preview.bak"
set "SOURCE=%~dp0app\one-on-one\page.tsx"

if not exist "%SOURCE%" (
  echo ERROR: The preview page file is missing.
  echo Extract the complete ZIP before running this command.
  pause
  exit /b 1
)

if not exist "%TARGET%" (
  echo ERROR: Your FACKTS one-on-one page was not found here:
  echo %TARGET%
  pause
  exit /b 1
)

if not exist "%BACKUP%" (
  copy /Y "%TARGET%" "%BACKUP%" >nul
  if errorlevel 1 (
    echo ERROR: Could not create the backup.
    pause
    exit /b 1
  )
)

copy /Y "%SOURCE%" "%TARGET%" >nul
if errorlevel 1 (
  echo ERROR: Could not apply the one-on-one preview.
  pause
  exit /b 1
)

echo.
echo SUCCESS: Premier League-style one-on-one preview applied.
echo ONLY app\one-on-one\page.tsx was changed.
echo Your original page is backed up and can be restored.
echo.
pause

