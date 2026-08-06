@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-1v1-ranking-scroll.ps1"

echo.
pause

