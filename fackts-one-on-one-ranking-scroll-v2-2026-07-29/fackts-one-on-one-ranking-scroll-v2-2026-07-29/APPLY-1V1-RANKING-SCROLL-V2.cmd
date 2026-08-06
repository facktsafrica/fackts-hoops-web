@echo off
setlocal
cd /d "%~dp0"

echo.
echo Installing the corrected FACKTS 1v1 mobile ranking scroll...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-1v1-ranking-scroll-v2.ps1"

echo.
pause

