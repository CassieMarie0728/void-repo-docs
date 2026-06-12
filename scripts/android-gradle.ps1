param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Task
)

$ErrorActionPreference = "Stop"

function Find-JavaHome {
    $candidates = @(
        $env:JAVA_HOME,
        "C:\Program Files\Android\Android Studio\jbr",
        "C:\Program Files\Android\Android Studio\jre",
        "C:\Program Files\Java\latest"
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path (Join-Path $candidate "bin\java.exe"))) {
            return (Resolve-Path $candidate).Path
        }
    }

    throw "No JDK found. Install Android Studio or set JAVA_HOME to a JDK 17+ installation."
}

function Find-AndroidSdk {
    $candidates = @(
        $env:ANDROID_SDK_ROOT,
        $env:ANDROID_HOME,
        (Join-Path $env:LOCALAPPDATA "Android\Sdk")
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path (Join-Path $candidate "platform-tools"))) {
            return (Resolve-Path $candidate).Path
        }
    }

    throw "No Android SDK found. Install it with Android Studio or set ANDROID_SDK_ROOT."
}

$env:JAVA_HOME = Find-JavaHome
$env:ANDROID_SDK_ROOT = Find-AndroidSdk
$env:ANDROID_HOME = $env:ANDROID_SDK_ROOT

Write-Host "Using JAVA_HOME=$env:JAVA_HOME"
Write-Host "Using ANDROID_SDK_ROOT=$env:ANDROID_SDK_ROOT"

$androidDirectory = Join-Path $PSScriptRoot "..\android"
Push-Location $androidDirectory
try {
    & ".\gradlew.bat" $Task
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
