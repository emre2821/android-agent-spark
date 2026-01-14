#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
WRAPPER_DIR="$PROJECT_DIR/platforms/android-wrapper"
GRADLEW="$WRAPPER_DIR/gradlew"

if [[ -z "${ANDROID_SDK_ROOT:-}" ]]; then
  echo "ANDROID_SDK_ROOT is not set. Install the Android SDK and export ANDROID_SDK_ROOT." >&2
  exit 1
fi

if [[ -z "${JAVA_HOME:-}" ]]; then
  echo "JAVA_HOME is not set. Install Temurin/OpenJDK 17 and export JAVA_HOME." >&2
  exit 1
fi

if [[ ! -f "$WRAPPER_DIR/gradle/wrapper/gradle-wrapper.jar" ]]; then
  echo "Fetching Gradle wrapper JAR..."
  mkdir -p "$WRAPPER_DIR/gradle/wrapper"
  curl -sSL https://services.gradle.org/distributions/gradle-8.6-bin.zip -o "$WRAPPER_DIR/gradle-8.6-bin.zip"
  unzip -q -p "$WRAPPER_DIR/gradle-8.6-bin.zip" gradle-8.6/lib/plugins/gradle-wrapper-8.6.jar > "$WRAPPER_DIR/gradle/wrapper/gradle-wrapper.jar"
  rm "$WRAPPER_DIR/gradle-8.6-bin.zip"
fi

pushd "$WRAPPER_DIR" >/dev/null
./gradlew clean assembleDebug
popd >/dev/null

APK_PATH="$WRAPPER_DIR/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$APK_PATH" ]]; then
  echo "Debug APK generated at $APK_PATH"
  echo "Install with: adb install -r $APK_PATH"
else
  echo "APK build failed; check Gradle output" >&2
  exit 1
fi
