@echo off
setlocal
echo.
echo Installing FACKTS navigation speed fix...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-navigation-speed-fix.ps1"
set "INSTALL_EXIT=%ERRORLEVEL%"
echo.
if not "%INSTALL_EXIT%"=="0" (
  echo Installation stopped. Nothing was changed if the safety check failed.
)
pause
exit /b %INSTALL_EXIT%
