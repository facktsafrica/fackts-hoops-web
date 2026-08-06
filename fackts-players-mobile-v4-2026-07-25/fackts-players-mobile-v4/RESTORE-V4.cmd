@echo off
title Restore FACKTS Players Before V4
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-v4.ps1"
echo.
pause

