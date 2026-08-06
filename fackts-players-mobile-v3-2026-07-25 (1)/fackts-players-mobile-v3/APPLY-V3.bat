@echo off
setlocal

set "PROJECT=C:\Users\user\Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
set "TARGET=%PROJECT%\app\players\page.tsx"
set "BACKUP=%PROJECT%\app\players\page.before-mobile-v3.tsx"
set "SOURCE=%~dp0page.tsx"

if not exist "%TARGET%" (
  echo.
  echo ERROR: The normal FACKTS players page was not found.
  echo Expected: %TARGET%
  echo.
  pause
  exit /b 1
)

if not exist "%SOURCE%" (
  echo.
  echo ERROR: page.tsx is missing beside APPLY-V3.bat.
  echo Extract the full ZIP before running this file.
  echo.
  pause
  exit /b 1
)

if not exist "%BACKUP%" (
  copy /Y "%TARGET%" "%BACKUP%" >nul
)

copy /Y "%SOURCE%" "%TARGET%" >nul

findstr /C:"function MobilePlayerRow" "%TARGET%" >nul
if errorlevel 1 (
  echo.
  echo ERROR: The V3 mobile card was not applied.
  echo Your existing page is still available at:
  echo %BACKUP%
  echo.
  pause
  exit /b 1
)

echo.
echo SUCCESS: FACKTS Players mobile V3 is now applied.
echo.
echo Changed:
echo - Mobile player cards only
echo - Games Logged replaced by Points Recorded
echo.
echo Preserved:
echo - Desktop cards
echo - Player data and Supabase queries
echo - Animations and background
echo.
echo Return to Chrome and press Ctrl + Shift + R on /players.
echo.
pause
