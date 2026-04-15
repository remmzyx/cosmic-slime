@echo off
setlocal EnableDelayedExpansion

set "JAVA_HOME="
for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk-21*") do set "JAVA_HOME=%%~D"
if not defined JAVA_HOME if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
)

if not defined JAVA_HOME (
  echo No JDK 17/21 found. Install Temurin 21:
  echo   winget install EclipseAdoptium.Temurin.21.JDK
  exit /b 1
)

echo Using JAVA_HOME=!JAVA_HOME!
set "PATH=!JAVA_HOME!\bin;%PATH%"

set "SDK_DIR="
set "SDK_OK="

if defined ANDROID_SDK_ROOT call :trySdk "!ANDROID_SDK_ROOT!"
if not defined SDK_OK if defined ANDROID_HOME call :trySdk "!ANDROID_HOME!"
if not defined SDK_OK call :trySdk "%LOCALAPPDATA%\Android\Sdk"
if not defined SDK_OK call :trySdk "C:\Android\Sdk"
if not defined SDK_OK call :trySdk "D:\Android\Sdk"
if not defined SDK_OK call :trySdk "%ProgramFiles%\Android\Sdk"

if not defined SDK_OK (
  for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "try { $a = (Get-Command adb -ErrorAction Stop).Source; if ($a) { Split-Path (Split-Path $a) } } catch { }"`) do (
    if not defined SDK_OK call :trySdk "%%p"
  )
)

if not defined SDK_OK (
  echo.
  echo Android SDK not found ^(need a folder that contains platform-tools\adb.exe^).
  echo.
  echo In Android Studio: File - Settings - Languages ^& Frameworks - Android SDK.
  echo Copy the path shown under "Android SDK location", then in PowerShell:
  echo   setx ANDROID_SDK_ROOT "C:\path\you\copied"
  echo Close this terminal, open a new one, run: npm.cmd run android:apk:debug
  echo.
  echo Also use SDK Manager to install at least one "Android SDK Platform" and Build-Tools.
  echo.
  exit /b 1
)

set "SDK_FWD=!SDK_DIR:\=/!"
(echo sdk.dir=!SDK_FWD!)> "%~dp0..\android\local.properties"
echo Using SDK: !SDK_DIR!

pushd "%~dp0..\android"
call gradlew.bat assembleDebug --no-daemon
set "EXITCODE=!ERRORLEVEL!"
popd
exit /b !EXITCODE!

:trySdk
set "SDK_OK="
if "%~1"=="" exit /b
if exist "%~1\platform-tools\adb.exe" (
  set "SDK_DIR=%~1"
  set "SDK_OK=1"
)
exit /b
