@echo off
REM Builds the web app, syncs into Android, installs DEBUG APK with bundled files (no dev server — works offline).
cd /d "%~dp0.."
call npm run build
if errorlevel 1 exit /b 1
call npx cap sync android
if errorlevel 1 exit /b 1
cd android
REM Play Store / release builds use a different signing key than debug. Uninstall first or you get:
REM INSTALL_FAILED_UPDATE_INCOMPATIBLE: signatures do not match
echo.
echo Uninstalling existing com.cosmicslime.app from device - OK if none installed.
adb uninstall com.cosmicslime.app 2>nul
call gradlew.bat installDebug
if errorlevel 1 exit /b 1
echo.
echo Done. App on phone should open without "connection refused" (uses files in the APK, not your PC).
exit /b 0
