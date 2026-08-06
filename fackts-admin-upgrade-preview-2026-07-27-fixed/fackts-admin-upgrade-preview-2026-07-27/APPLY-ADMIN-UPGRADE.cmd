@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-admin-upgrade.ps1"
echo.
pause
