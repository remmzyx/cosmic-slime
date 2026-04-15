# Appends NDJSON lines to debug-affa37.log for emulator-crash diagnosis (run from repo root after a crash).
# Session affa37 — no secrets logged.
$ErrorActionPreference = "Continue"
$repo = Split-Path $PSScriptRoot -Parent
$log = Join-Path $repo "debug-affa37.log"
function Append-Log($hypothesisId, $message, $data) {
  $o = @{
    sessionId    = "affa37"
    hypothesisId = $hypothesisId
    message      = $message
    data         = $data
    timestamp    = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  }
  Add-Content -Path $log -Value ($o | ConvertTo-Json -Compress -Depth 6)
}

Append-Log "H0" "record-emulator-env start" @{ pwd = (Get-Location).Path }

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
Append-Log "H1" "SDK paths" @{
  ANDROID_HOME_raw = $env:ANDROID_HOME
  resolvedSdkPath  = $sdk
  sdkExists        = (Test-Path $sdk)
}

$emu = Join-Path $sdk "emulator\emulator.exe"
if (Test-Path $emu) {
  $ver = & $emu -version 2>&1 | Out-String
  if ($ver.Length -gt 4000) { $ver = $ver.Substring(0, 4000) + "..." }
  Append-Log "H2" "emulator -version" @{ output = $ver }
}
else {
  Append-Log "H2" "emulator.exe missing" @{ path = $emu }
}

$avds = & $emu -list-avds 2>&1 | Out-String
Append-Log "H3" "emulator -list-avds" @{ output = $avds }

try {
  $whp = Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -ErrorAction SilentlyContinue
  Append-Log "H4" "WindowsOptionalFeature HypervisorPlatform" @{ State = $whp.State }
}
catch {
  Append-Log "H4" "HypervisorPlatform check failed" @{ error = $_.Exception.Message }
}

# Post-fix verification: hw.gpu lines for every AVD (Pixel_7, Pixel_9a, etc.)
$avdRoot = Join-Path $env:USERPROFILE ".android\avd"
$byAvd = @{}
if (Test-Path $avdRoot) {
  Get-ChildItem -LiteralPath $avdRoot -Filter "*.avd" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $ini = Join-Path $_.FullName "config.ini"
    $name = $_.BaseName
    if (Test-Path $ini) {
      $gpuLines = (Select-String -LiteralPath $ini -Pattern "^\s*hw\.gpu\." -ErrorAction SilentlyContinue | ForEach-Object { $_.Line }) -join "`n"
      $byAvd[$name] = if ($gpuLines) { $gpuLines } else { "(no hw.gpu lines)" }
    }
    else {
      $byAvd[$name] = "(missing config.ini)"
    }
  }
}
if ($byAvd.Count -eq 0) {
  Append-Log "H5" "No AVD folders under .android/avd" @{ path = $avdRoot }
}
else {
  Append-Log "H5" "Per-AVD hw.gpu lines" @{ avds = $byAvd }
}

Write-Host "Wrote entries to: $log"
