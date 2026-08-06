@echo off
setlocal
cd /d "%~dp0"

echo.
echo Installing FACKTS 1v1 highlights and Guest Hooper profiles...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-highlight-guest-profiles.ps1"

echo.
pause

