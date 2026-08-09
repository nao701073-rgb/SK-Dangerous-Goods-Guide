@echo off
setlocal
cd /d "%~dp0"
call "%~dp0ORGANIZE_UPDATE_HISTORY.cmd"
exit /b %errorlevel%
