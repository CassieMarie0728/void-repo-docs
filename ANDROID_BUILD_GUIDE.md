# Android Build Guide for VOID Repo Docs

This guide explains how to build APK and AAB (Android App Bundle) files for the VOID Repo Docs web
app wrapped with Capacitor.

## Prerequisites

Before building, ensure you have:

1. **Android SDK** installed via Android Studio
    - API Level 34+ (recommended)
    - Build Tools 34.0.0+

2. **Java Development Kit (JDK)**
    - JDK 17+ (recommended)
    - The Windows build scripts automatically use `JAVA_HOME` or Android Studio's bundled JDK

3. **Environment Variables (optional)**
   ```bash
   # Android SDK Path (Windows)
   ANDROID_SDK_ROOT=C:\Users\<YourUsername>\AppData\Local\Android\Sdk
   ANDROID_HOME=C:\Users\<YourUsername>\AppData\Local\Android\Sdk
   JAVA_HOME=C:\Program Files\Java\jdk-21
   
   # Add to PATH
   %JAVA_HOME%\bin
   %ANDROID_SDK_ROOT%\tools
   %ANDROID_SDK_ROOT%\platform-tools
   ```

4. **Node.js & npm** (already installed)

On Windows, the npm Android commands automatically detect Android Studio's bundled JDK and the
default SDK at `%LOCALAPPDATA%\Android\Sdk`. Set the environment variables only when using
non-standard installation paths.

Native builds call the production Cloud Run API by default. Set `VITE_API_BASE_URL` before building
to target a different deployed backend. A local Express server is not embedded in the APK.

## Quick Start Commands

### 1. Build Debug APK (Testing)

```bash
npm run android:apk
```

- Generates: `android/app/build/outputs/apk/debug/app-debug.apk`
- Use for testing on emulator or physical device
- Not signed for Play Store

### 2. Build Release APK (Device Distribution)

```bash
npm run android:apk:release
```

- Generates: `android/app/build/outputs/apk/release/app-release-unsigned.apk`
- Requires signing before distribution
- Use for direct APK distribution

### 3. Build App Bundle (AAB) for Play Store

```bash
npm run android:aab
```

- Generates: `android/app/build/outputs/bundle/release/app-release.aab`
- **This is required for Google Play Store**
- Smaller download size than APK
- Google Play handles device-specific APK generation

## Detailed Build Process

### Step 1: Prepare Web Assets

```bash
npm run build
```

- Builds React frontend to `dist/`
- Bundles Node.js server

### Step 2: Sync Web Assets to Android

```bash
npm run cap:sync
```

- Copies `dist/` contents to Android web view
- Updates `capacitor.config.json`

### Step 3: Build with Gradle

```bash
cd android
./gradlew build                 # Full build (debug + release)
./gradlew assembleDebug         # Debug APK only
./gradlew assembleRelease       # Release APK (unsigned)
./gradlew bundleRelease         # App Bundle (AAB)
```

## Signing Your App (Required for Play Store)

### Generate Keystore

```bash
keytool -genkey -v -keystore void-repo-docs.jks -keyalg RSA -keysize 2048 -validity 10950 -alias void-app
```

This will create a key file with:

- Initial password
- Key password
- Alias: `void-app`
- Validity: 30 years (10950 days)

**Important:** Back up this file to a safe location! You'll need it for all future app updates.

### Sign Release APK

```bash
cd android/app/build/outputs/apk/release/
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore ../../../void-repo-docs.jks app-release-unsigned.apk void-app
```

### Optimize with zipalign

```bash
zipalign -v 4 app-release-unsigned.apk app-release-signed.apk
```

The final `app-release-signed.apk` is ready for distribution.

## Sign Automatically (Gradle Configuration)

Edit `android/app/build.gradle` to auto-sign releases:

```gradle
android {
    compileSdkVersion 34
    
    signingConfigs {
        release {
            storeFile file("../void-repo-docs.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "your-password"
            keyAlias System.getenv("KEY_ALIAS") ?: "void-app"
            keyPassword System.getenv("KEY_PASSWORD") ?: "your-password"
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
        }
    }
}
```

Then build:

```bash
KEYSTORE_PASSWORD=your-pw KEY_PASSWORD=your-pw ./gradlew bundleRelease
```

## Build Output Locations

After building, find your files here:

| Build Type  | Output Path                                                      | Use Case                            |
|-------------|------------------------------------------------------------------|-------------------------------------|
| Debug APK   | `android/app/build/outputs/apk/debug/app-debug.apk`              | Testing on emulator/device          |
| Release APK | `android/app/build/outputs/apk/release/app-release-unsigned.apk` | Direct distribution (after signing) |
| App Bundle  | `android/app/build/outputs/bundle/release/app-release.aab`       | Google Play Store                   |

## Testing

### Install Debug APK to Device/Emulator

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Launch App

```bash
adb shell am start -n com.c728.voidrepodocs/.MainActivity
```

### View Logs

```bash
adb logcat | grep voidrepodocs
```

## Troubleshooting

### Android Studio Shows XML Attribute Errors

Open the `android/` directory as the Android Studio project, then allow Gradle sync to finish. Do not
open the repository root as a plain Java project; Android Studio will treat Android resources as
generic XML and report false errors such as `Attribute android:width is not allowed here`.

### Gradle Build Fails

```bash
cd android
./gradlew clean build --refresh-dependencies
```

### Web Assets Not Updated

```bash
npm run cap:sync
```

### JDK Version Mismatch

```bash
# Check Java version
java -version

# Should be 17+
```

The npm build commands use `scripts/android-gradle.ps1`, which checks `JAVA_HOME` first and then
falls back to Android Studio's bundled JDK.

### Capacitor Out of Sync

```bash
npm run build && npx cap copy android
```

## Uploading to Play Store

1. **Create Google Play App:**
    - Go to Google Play Console
    - Create new app with name "VOID Repo Docs"
    - Fill out store description, screenshots, etc.

2. **Upload AAB:**
    - In "Release" → "Production"
    - Upload `app-release.aab`
    - Google Play auto-generates device-specific APKs

3. **Set Min API Level:**
    - Currently set to API 24 (Android 7.0+)
    - Adjust in `android/app/build.gradle` if needed

## Configuration Files

- **capacitor.config.ts** - Main Capacitor config
- **android/app/build.gradle** - Android build configuration
- **android/app/src/main/AndroidManifest.xml** - App permissions & metadata
- **android/app/src/main/assets/capacitor.config.json** - Runtime Capacitor config

## Next Steps

- Set up signing with keystore
- Generate app bundle for Play Store
- Submit to Google Play Console
- Monitor performance and user reviews

For more info: https://capacitorjs.com/docs/android

