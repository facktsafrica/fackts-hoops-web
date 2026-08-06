@echo off
title Restore FACKTS Players Before V5
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-v5.ps1"
echo.
pause
