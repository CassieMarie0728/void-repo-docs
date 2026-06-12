#!/usr/bin/env pwsh

# VOID Repo Docs - Android Build Script (PowerShell)
# This script automates the process of building APK and AAB files

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================"
Write-Host "VOID Repo Docs - Android Build Helper"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Show-Help
{
    Write-Host "Usage: ./build-android.ps1 [-Command] <command>"
    Write-Host ""
    Write-Host "Available commands:"
    Write-Host "  debug          Build debug APK for testing"
    Write-Host "  release        Build release APK"
    Write-Host "  aab            Build App Bundle for Play Store"
    Write-Host "  clean          Clean build artifacts"
    Write-Host "  sync           Sync web assets to Android"
    Write-Host "  help           Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  ./build-android.ps1 -Command debug"
    Write-Host "  ./build-android.ps1 -Command aab"
}

function Invoke-Build
{
    param(
        [string]$Command
    )

    if (-not $Command)
    {
        Show-Help
        return
    }

    switch ($Command)
    {
        "debug" {
            Write-Host "Building Debug APK..." -ForegroundColor Green
            Write-Host ""
            npm run android:apk
            if ($LASTEXITCODE -ne 0)
            {
                Write-Host "[ERROR] Build failed!" -ForegroundColor Red
                exit 1
            }
            Write-Host ""
            Write-Host "[SUCCESS] Debug APK built!" -ForegroundColor Green
            Write-Host "Location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Yellow
        }
        "release" {
            Write-Host "Building Release APK..." -ForegroundColor Green
            Write-Host ""
            npm run android:apk:release
            if ($LASTEXITCODE -ne 0)
            {
                Write-Host "[ERROR] Build failed!" -ForegroundColor Red
                exit 1
            }
            Write-Host ""
            Write-Host "[SUCCESS] Release APK built!" -ForegroundColor Green
            Write-Host "Location: android\app\build\outputs\apk\release\app-release-unsigned.apk" -ForegroundColor Yellow
            Write-Host "Note: This APK needs to be signed before distribution" -ForegroundColor Yellow
        }
        "aab" {
            Write-Host "Building App Bundle for Play Store..." -ForegroundColor Green
            Write-Host ""
            npm run android:aab
            if ($LASTEXITCODE -ne 0)
            {
                Write-Host "[ERROR] Build failed!" -ForegroundColor Red
                exit 1
            }
            Write-Host ""
            Write-Host "[SUCCESS] App Bundle built!" -ForegroundColor Green
            Write-Host "Location: android\app\build\outputs\bundle\release\app-release.aab" -ForegroundColor Yellow
            Write-Host "This file is ready to upload to Google Play Store" -ForegroundColor Yellow
        }
        "clean" {
            Write-Host "Cleaning build artifacts..." -ForegroundColor Green
            npm run android:clean
            if ($LASTEXITCODE -ne 0)
            {
                Write-Host "[ERROR] Clean failed!" -ForegroundColor Red
                exit 1
            }
            Write-Host "[SUCCESS] Clean complete!" -ForegroundColor Green
        }
        "sync" {
            Write-Host "Syncing web assets..." -ForegroundColor Green
            npm run cap:sync
            Write-Host "[SUCCESS] Web assets synced!" -ForegroundColor Green
        }
        "help" {
            Show-Help
        }
        default {
            Write-Host "[ERROR] Unknown command: $Command" -ForegroundColor Red
            Write-Host "Use './build-android.ps1 help' for available commands" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Run the build command
Invoke-Build -Command $args[0]
Write-Host ""

