$ErrorActionPreference = "Stop"

# Tries to locate a usable JDK and prints a PowerShell command to set JAVA_HOME
# for the current terminal session. This avoids requiring admin privileges.

function Resolve-JavaHome {
  # Prefer Android Studio bundled JBR (stable for Gradle)
  $candidates = @(
    "$env:ProgramFiles\Android\Android Studio\jbr",
    "$env:ProgramFiles\Android\Android Studio\jre",
    "$env:ProgramFiles\Java\jdk-21",
    "$env:ProgramFiles\Java\jdk-17",
    "$env:ProgramFiles\Microsoft\jdk-17.0.0.0-hotspot"
  ) | Where-Object { $_ -and (Test-Path $_) }

  foreach ($p in $candidates) {
    if (Test-Path (Join-Path $p "bin\java.exe")) { return $p }
  }
  return $null
}

$javaHome = Resolve-JavaHome
if (-not $javaHome) {
  Write-Host "Could not find a JDK automatically." -ForegroundColor Red
  Write-Host "Install a JDK (or Android Studio) and set JAVA_HOME to that path." -ForegroundColor Yellow
  exit 1
}

Write-Host "Found JDK at: $javaHome" -ForegroundColor Green
Write-Host ""
Write-Host "Run this in your current PowerShell to set JAVA_HOME for this session:" -ForegroundColor Cyan
Write-Host "`$env:JAVA_HOME = `"$javaHome`"; `$env:Path = `"$javaHome\\bin;`$env:Path`"" -ForegroundColor Cyan

