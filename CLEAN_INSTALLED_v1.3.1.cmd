@echo off
chcp 65001 >nul
setlocal
PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cleanup_installed_v1.3.1.ps1"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo Cleanup was not completed. No forced deletion will be performed.
  pause
)
exit /b %RC%
