# Electron Build Guide

Electron packages the same web experience into a desktop app.

## Prerequisites
- Node.js 18+
- npm dependencies installed in the repo root
- Platform-specific tooling for code signing if required

## Steps
1. Build the shared web assets:
   ```bash
   npm run build:web
   ```
2. Run the Electron packaging script:
   ```bash
   npm run build:desktop
   ```
3. Find installers or unpacked builds under the Electron output directory configured in `scripts/build/build_desktop.js`.

## Notes
- Update application icons and metadata inside `platforms/electron-desktop/` before shipping.
- Add notarization/signing steps per platform in CI once certificates are available.
