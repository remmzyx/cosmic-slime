# Forces an AVD to use SwiftShader (software) instead of gfxstream — common fix for "emulator closed unexpectedly" on Windows.
# Close Android Studio and quit any running emulator before running.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\force-avd-software-gpu.ps1 [-AvdName Pixel_7]
param(
  [string]$AvdName = "Pixel_7"
)

$ErrorActionPreference = "Stop"
$avdDir = Join-Path $env:USERPROFILE ".android\avd\$AvdName.avd"
$ini = Join-Path $avdDir "config.ini"

if (-not (Test-Path $ini)) {
  Write-Error "Not found: $ini (create the AVD in Device Manager first or fix -AvdName)"
}

$bak = "$ini.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $ini -Destination $bak -Force
Write-Host "Backup: $bak"

$lines = Get-Content -LiteralPath $ini
$filtered = $lines | Where-Object { $_ -notmatch '^\s*hw\.gpu\.' }
$new = @()
$new += $filtered
$new += ""
$new += "# agent: force software GPU (SwiftShader) — revert backup if needed"
$new += "hw.gpu.enabled = yes"
$new += "hw.gpu.mode = swiftshader_indirect"

Set-Content -LiteralPath $ini -Value $new -Encoding utf8
Write-Host "Updated $ini — hw.gpu.mode = swiftshader_indirect"
Write-Host "Start the AVD again from Device Manager."
