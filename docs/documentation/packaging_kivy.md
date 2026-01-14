# Optional Kivy/Briefcase Packaging

This repository primarily ships the WebView wrapper under `platforms/android-wrapper/`. If you prefer a
fully native Python bundle, you can experiment with [BeeWare Briefcase](https://beeware.org/project/projects/tools/briefcase/).

## Prerequisites
- Python 3.11
- Java JDK 17
- Android SDK with build tools 34+

## Quick Start
1. Install Briefcase:
   ```bash
   python -m pip install briefcase
   ```
2. Create a new Kivy app skeleton:
   ```bash
   briefcase new
   ```
3. Copy the backend package from this repository into the new Briefcase project and
   expose a bootstrap script that launches `python -m app.cli runserver` in a background
   thread. Use Kivy's `WebView` widget or an embedded browser control to render the web
   frontend (bundle the `apps/web-app/dist` assets).
4. Build the Android APK:
   ```bash
   briefcase create android
   briefcase build android
   briefcase run android
   ```

This path is not officially supported yet, but the `docs/packaging_kivy.md` file captures the
basic flow for experimentation.
