$ErrorActionPreference = "Stop"

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk" }

if (-not (Test-Path $sdk)) {
  Write-Host "Android SDK not found at: $sdk" -ForegroundColor Red
  Write-Host "Set ANDROID_HOME (or ANDROID_SDK_ROOT) to your SDK path from Android Studio > Settings > Android SDK." -ForegroundColor Yellow
  exit 1
}

$androidDir = Join-Path $PSScriptRoot "..\android"
if (-not (Test-Path $androidDir)) {
  Write-Host "No android/ directory found at: $androidDir" -ForegroundColor Red
  Write-Host "Run: npx expo prebuild -p android (or npx expo run:android) once to generate it." -ForegroundColor Yellow
  exit 1
}

$localProps = Join-Path $androidDir "local.properties"
$sdkEscaped = $sdk -replace "\\","\\"
"sdk.dir=$sdkEscaped" | Set-Content -Encoding ASCII -Path $localProps

Write-Host "Wrote $localProps" -ForegroundColor Green
Write-Host "sdk.dir=$sdk" -ForegroundColor Green

