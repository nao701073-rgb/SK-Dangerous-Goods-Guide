@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ORGANIZE_UPDATE_HISTORY.ps1"
if errorlevel 1 (
  echo.
  echo An error occurred. Please check the message above.
  pause
  exit /b 1
)
echo.
echo Completed. Please check git status in VS Code.
pause
