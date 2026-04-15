# Creates android/upload-keystore.jks + android/keystore.properties for Play Store bundleRelease.
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts\setup-play-keystore.ps1
# Or double-click after right-click Run with PowerShell (if allowed).

$ErrorActionPreference = "Stop"
# scripts/setup-play-keystore.ps1 -> repo root is parent of scripts/
$repoRoot = Split-Path $PSScriptRoot -Parent
$androidDir = Join-Path $repoRoot "android"
if (-not (Test-Path $androidDir)) {
  Write-Error "android folder not found: $androidDir"
}

$props = Join-Path $androidDir "keystore.properties"
$jks = Join-Path $androidDir "upload-keystore.jks"

if ((Test-Path $props) -or (Test-Path $jks)) {
  Write-Host "Already exists: keystore.properties and/or upload-keystore.jks"
  Write-Host "Delete those files in android\ first if you need a brand-new upload key."
  exit 1
}

Write-Host "Play upload keystore setup (android folder)"
Write-Host ""
$p1 = Read-Host "Choose a keystore password (save it - you need it for Play updates)"
if ([string]::IsNullOrWhiteSpace($p1) -or $p1.Length -lt 6) {
  Write-Error "Password must be at least 6 characters."
}

$keytool = "keytool"
$kt = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $kt) {
  $javaHome = $env:JAVA_HOME
  if ($javaHome) {
    $keytool = Join-Path $javaHome "bin\keytool.exe"
  }
  if (-not (Test-Path $keytool)) {
    Write-Error "keytool not found. Install JDK 17+ and add JAVA_HOME or JDK bin to PATH."
  }
}

$dname = 'CN=Play Upload, OU=Android, O=App, C=US'
$args = @(
  "-genkeypair", "-v",
  "-keystore", $jks,
  "-alias", "upload",
  "-keyalg", "RSA",
  "-keysize", "2048",
  "-validity", "10000",
  "-storepass", $p1,
  "-keypass", $p1,
  "-dname", $dname
)

& $keytool @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$lines = @(
  "storePassword=$p1",
  "keyPassword=$p1",
  "keyAlias=upload",
  "storeFile=upload-keystore.jks"
)
[System.IO.File]::WriteAllLines($props, $lines)

Write-Host ""
Write-Host "Done."
Write-Host "  Keystore: $jks"
Write-Host "  Gradle:   $props"
Write-Host ""
Write-Host "Next:"
Write-Host "  cd $repoRoot"
Write-Host "  npm run build"
Write-Host "  npx cap sync android"
Write-Host "  cd android"
Write-Host "  gradlew.bat bundleRelease"
Write-Host ""
Write-Host "AAB path: android/app/build/outputs/bundle/release/app-release.aab"
