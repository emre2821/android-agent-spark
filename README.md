# Android Agent Spark

A multi-platform AI agent workspace that ships on web, Android (Capacitor), Electron, and server runtimes with batteries-included workflows.

![Demo screenshot placeholder](public/demo-screenshots/placeholder.png)

## Quickstart

### Clone
```
git clone https://github.com/emre2821/android-agent-spark.git
cd android-agent-spark
npm install
```

### Web development
```
npm run dev:web
```
The web app runs via Vite on port 3000 by default.

### Server development
```
npm run dev:server
```
This starts the Node API on port 3001. Environment variables can be set via `.env`.

### Docker demo
1. Build and start both services:
```
docker-compose up --build
```
2. Open the web UI at http://localhost:3000 (API on http://localhost:3001).

## Android build (Capacitor)
1. Build the web assets:
```
npm run build
```
2. Sync to Android:
```
npx cap sync android
```
3. Open Android Studio to generate a signed AAB or APK from the `android` project.

## Electron build
Run the desktop build pipeline from the repository root:
```
npm run build:desktop
```
Package artifacts will be placed under your Electron output directory (configure in `scripts/build_desktop.js`).

## Folder structure
```
.
├─ web/                # Vite + React frontend
├─ server/             # Node server runtime and APIs
├─ android-wrapper/    # Capacitor Android host
├─ electron/           # Electron shell and packaging scripts
├─ docs/               # Build and demo guides
├─ public/demo-screenshots/ # Drop screenshots and GIFs for README/marketing
└─ scripts/            # Automation for mobile/desktop builds
```

## Downloads
Grab ready-to-install builds from the [Releases](https://github.com/emre2821/android-agent-spark/releases) page. Android APKs/AABs and desktop installers will be published alongside the web bundle.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for code style, branching, and testing guidance.

## License (MIT)
This project is licensed under the [MIT License](LICENSE).

## Contact
For questions or partnerships, open an issue or email the maintainers (placeholder@android-agent-spark.dev).
