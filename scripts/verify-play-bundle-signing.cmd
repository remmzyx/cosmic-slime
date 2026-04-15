@echo off
REM Verifies the release AAB is not debug-signed (Play rejects debug). Requires JDK keytool/jarsigner on PATH.
setlocal
set AAB=%~dp0..\android\app\build\outputs\bundle\release\app-release.aab
if not exist "%AAB%" (
  echo AAB not found. Build first: npm run build ^&^& npx cap sync android ^&^& cd android ^&^& gradlew.bat bundleRelease
  exit /b 1
)
echo Checking: %AAB%
echo.
jarsigner -verify -verbose -certs "%AAB%" 2>nul
if errorlevel 1 (
  echo jarsigner failed. Ensure JDK bin is on PATH.
  exit /b 1
)
echo.
echo If you see "CN=Android Debug" or "Android Debug" in the certificate chain, Play will REJECT the upload.
echo A proper upload keystore shows YOUR name or company in the certificate.
echo.
keytool -printcert -jarfile "%AAB%" 2>nul
if errorlevel 1 echo keytool -printcert failed - JDK may be missing.
exit /b 0
