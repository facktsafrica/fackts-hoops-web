@echo off
setlocal

set "PROJECT=C:\Users\user\Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
set "TARGET=%PROJECT%\app\players\page.tsx"
set "BACKUP=%PROJECT%\app\players\page.before-mobile-v3.tsx"

if not exist "%BACKUP%" (
  echo.
  echo ERROR: No V3 backup was found.
  echo.
  pause
  exit /b 1
)

copy /Y "%BACKUP%" "%TARGET%" >nul

echo.
echo SUCCESS: The players page was restored to its pre-V3 version.
echo.
pause
