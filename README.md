# Android Agent Spark

[![CI](https://github.com/emre2821/android-agent-spark/actions/workflows/ci.yml/badge.svg)](https://github.com/emre2821/android-agent-spark/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2024.11.7-blue.svg)](https://github.com/emre2821/android-agent-spark/releases)

A multi-platform AI agent workspace that ships on web, Android (Capacitor), Electron, and server runtimes with batteries-included workflows.

![Demo screenshot placeholder](apps/frontend-app/public/demo-screenshots/placeholder.png)

## Repository Structure

This is a monorepo organized as follows:

```
/
├── apps/
│   ├── frontend-app/     # Main React/TypeScript frontend (Vite)
│   └── web-app/          # Secondary web frontend
├── services/
│   ├── nodejs-server/    # Node.js API server
│   └── python-backend/   # Python backend application and scripts
│   ├── app/              # Python API server
│   └── tests/            # Python tests
├── scripts/              # Build scripts for mobile and desktop
│   └── build/            # Build script bundle
│       ├── shell/        # Shell scripts (.sh)
│       ├── build_mobile.js   # Mobile build script
│       └── build_desktop.js  # Desktop build script
├── docs/                 # Documentation and architecture diagrams
│   └── documentation/    # Project documentation
├── packages/             # Shared TypeScript utilities
│   └── ts-common/        # Common TypeScript code
├── platforms/            # Platform-specific shells
│   ├── android-wrapper/  # Capacitor Android host
│   └── electron-desktop/ # Electron desktop shell
├── config/               # Miscellaneous config files
│   └── misc/             # Root config storage
├── .github/workflows/    # CI/CD workflows
└── README.md
```

## Quickstart

### Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+ (for backend)
- Make (optional, for Makefile commands)

### Installation

```bash
# Clone the repository
git clone https://github.com/emre2821/android-agent-spark.git
cd android-agent-spark

# Install all dependencies
npm run install:all
# Or using Make:
make install

# Copy environment example
cp .env.example .env
```

### Web Development

```bash
# Run the web frontend
npm run dev:web
# Or: make dev-web
```
The web app runs via Vite on port 3000 by default.

### Frontend Development (main app)

```bash
# Run the main frontend
npm run dev:frontend
# Or: make dev-frontend
```

### Server Development

```bash
# Run the Node.js API server
npm run dev:server
# Or: make dev-server
```
The server runs on port 3001. Environment variables can be set via `.env`.

### Python Backend

```bash
# Navigate to Python backend
cd services/python-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Run the backend
python -m app.cli runserver --host 0.0.0.0 --port 8000
```

### Docker Demo

```bash
# Build and start both services
docker-compose up --build
# Or: make docker-up
```
Open the web UI at http://localhost:3000 (API on http://localhost:3001).

## Building

### Build All

```bash
npm run build
# Or: make build
```

### Build for Android (Capacitor)

```bash
npm run build:mobile
npx cap sync android
```
Then open Android Studio to generate a signed AAB or APK from the `platforms/android-wrapper` project.

### Build for Desktop (Electron)

```bash
npm run build:desktop
```
Package artifacts will be placed under `dist/desktop/`.

## Testing

```bash
# Run all tests
npm test
# Or: make test

# Run frontend tests
npm run test:frontend

# Run web tests
npm run test:web

# Run server tests
npm run test:server

# Run Python tests
cd services/python-backend && pytest
```

## Linting

```bash
npm run lint
# Or: make lint
```

## Make Commands

For convenience, a `Makefile` is provided with common commands:

```bash
make help        # Show all available commands
make install     # Install all dependencies
make dev         # Start development servers
make build       # Build all projects
make test        # Run all tests
make lint        # Run linting
make docker-up   # Start Docker containers
make clean       # Remove build artifacts
```

## Downloads

Grab ready-to-install builds from the [Releases](https://github.com/emre2821/android-agent-spark/releases) page.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for code style, branching, and testing guidance.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For questions or partnerships, open an issue or email the maintainers.
