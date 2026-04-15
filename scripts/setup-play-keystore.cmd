@echo off
setlocal
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-play-keystore.ps1"
if errorlevel 1 pause
exit /b %ERRORLEVEL%
