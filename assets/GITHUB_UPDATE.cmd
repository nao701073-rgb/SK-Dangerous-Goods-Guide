@echo off
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0GITHUB_SETUP_AND_UPDATE.ps1"
