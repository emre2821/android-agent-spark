# Android Build Guide

This project ships a Capacitor-based Android wrapper that consumes the built web assets.

## Prerequisites
- Node.js 18+
- Android Studio with Android SDKs
- Java 17+
- Capacitor CLI: `npm install -g @capacitor/cli` (optional when using local node_modules)

## Steps
1. Build the web frontend:
   ```bash
   npm run build
   ```
2. Sync assets into the Android project:
   ```bash
   npx cap sync android
   ```
3. Open `android/` (or `platforms/android-wrapper/`) in Android Studio and generate a signed AAB/APK via Build > Generate Signed Bundle / APK.
4. Optionally run on a device/emulator:
   ```bash
   npx cap run android
   ```

## Signing
Configure your keystore in `android/app/build.gradle` and provide signing configs before creating release bundles.
