@echo off
REM VOID Repo Docs - Android Build Script
REM This script automates the process of building APK and AAB files

setlocal enabledelayedexpansion

echo.
echo ========================================
echo VOID Repo Docs - Android Build Helper
echo ========================================
echo.

if "%1"=="" (
    echo Usage: build-android.bat [command]
    echo.
    echo Available commands:
    echo   debug          - Build debug APK for testing
    echo   release        - Build release APK
    echo   aab            - Build App Bundle for Play Store
    echo   clean          - Clean build artifacts
    echo   sync           - Sync web assets to Android
    echo   help           - Show this help message
    echo.
    echo Examples:
    echo   build-android.bat debug
    echo   build-android.bat aab
    exit /b 0
)

if "%1"=="debug" (
    echo Building Debug APK...
    echo.
    call npm run android:apk
    if errorlevel 1 (
        echo [ERROR] Build failed!
        exit /b 1
    )
    echo.
    echo [SUCCESS] Debug APK built!
    echo Location: android\app\build\outputs\apk\debug\app-debug.apk
    goto :end
)

if "%1"=="release" (
    echo Building Release APK...
    echo.
    call npm run android:apk:release
    if errorlevel 1 (
        echo [ERROR] Build failed!
        exit /b 1
    )
    echo.
    echo [SUCCESS] Release APK built!
    echo Location: android\app\build\outputs\apk\release\app-release-unsigned.apk
    echo Note: This APK needs to be signed before distribution
    goto :end
)

if "%1"=="aab" (
    echo Building App Bundle for Play Store...
    echo.
    call npm run android:aab
    if errorlevel 1 (
        echo [ERROR] Build failed!
        exit /b 1
    )
    echo.
    echo [SUCCESS] App Bundle built!
    echo Location: android\app\build\outputs\bundle\release\app-release.aab
    echo This file is ready to upload to Google Play Store
    goto :end
)

if "%1"=="clean" (
    echo Cleaning build artifacts...
    cd android
    call gradlew clean
    cd ..
    echo [SUCCESS] Clean complete!
    goto :end
)

if "%1"=="sync" (
    echo Syncing web assets...
    call npm run cap:sync
    echo [SUCCESS] Web assets synced!
    goto :end
)

if "%1"=="help" (
    echo VOID Repo Docs - Build Help
    echo.
    echo Available commands:
    echo   debug          - Build debug APK for testing
    echo   release        - Build release APK
    echo   aab            - Build App Bundle for Play Store
    echo   clean          - Clean build artifacts
    echo   sync           - Sync web assets to Android
    echo.
    echo Requirements:
    echo   - Android SDK installed
    echo   - Java JDK 17+ installed
    echo   - JAVA_HOME and ANDROID_SDK_ROOT environment variables set
    echo.
    echo For detailed instructions, see: ANDROID_BUILD_GUIDE.md
    goto :end
)

echo [ERROR] Unknown command: %1
echo Use 'build-android.bat help' for available commands
exit /b 1

:end
echo.
pause

