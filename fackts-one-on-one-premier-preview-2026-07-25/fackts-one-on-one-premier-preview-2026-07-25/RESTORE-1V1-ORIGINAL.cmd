@echo off
setlocal

set "TARGET=C:\Users\user\Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web\app\one-on-one\page.tsx"
set "BACKUP=%TARGET%.before-premier-preview.bak"

if not exist "%BACKUP%" (
  echo ERROR: No one-on-one preview backup was found.
  pause
  exit /b 1
)

copy /Y "%BACKUP%" "%TARGET%" >nul
if errorlevel 1 (
  echo ERROR: Could not restore the original one-on-one page.
  pause
  exit /b 1
)

echo.
echo SUCCESS: The original one-on-one page was restored.
echo.
pause

