# Android Wrapper Setup

The Android project includes its Gradle wrapper under `android/`.

Run tasks through the repository helper so Windows can locate Android Studio's JDK and the SDK:

```powershell
npm run android:gradle -- tasks
npm run android:gradle -- assembleDebug
```

Complete setup and troubleshooting live in [`docs/android.md`](docs/android.md).
