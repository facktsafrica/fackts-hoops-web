@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-admin-upgrade.ps1"
echo.
pause
