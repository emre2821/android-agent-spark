# Repository Organization

This document describes the new organized structure of the Android Agent Spark repository.

## Overview

The repository has been reorganized into dedicated project folders to improve clarity and make it easier to extract individual projects in the future. Each major component now has its own clearly-named folder at the root level.

## Project Folders

### `apps/frontend-app/`
**Former location:** `frontend-app/`

The main React/TypeScript frontend application built with Vite. This is the primary user interface for the Agent Spark system.

- **Tech Stack:** React 18, TypeScript, Vite, TailwindCSS
- **Build:** `npm --prefix apps/frontend-app run build`
- **Dev Server:** `npm --prefix apps/frontend-app run dev`
- **Tests:** `npm --prefix apps/frontend-app run test`

### `apps/web-app/`
**Former location:** `web-app/`

Secondary web frontend application, also built with React and Vite.

- **Tech Stack:** React, TypeScript, Vite
- **Build:** `npm --prefix apps/web-app run build`
- **Dev Server:** `npm --prefix apps/web-app run dev`
- **Tests:** `npm --prefix apps/web-app run test`

### `services/nodejs-server/`
**Former location:** `nodejs-server/`

Node.js API server providing backend services for the Agent Spark system.

- **Tech Stack:** Node.js, Express, WebSocket, SQLite
- **Start:** `npm --prefix services/nodejs-server run dev`
- **Tests:** `npm --prefix services/nodejs-server run test`
- **Port:** 3001 (default)

### `services/python-backend/`
**Former location:** `python-backend/`

Python backend application providing additional API services and background automation.

- **Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy
- **Setup:** `cd services/python-backend && pip install -r requirements.txt`
- **Start:** `cd services/python-backend && python -m app.cli runserver --host 0.0.0.0 --port 8000`
- **Tests:** `cd services/python-backend && pytest`
- **Port:** 8000 (default)

### `platforms/android-wrapper/`
**Former location:** `android-wrapper/`

Capacitor-based Android application wrapper.

- **Tech Stack:** Capacitor, Android/Kotlin
- **Build:** `npm run build:mobile && npx cap sync android`
- **Location:** Open `platforms/android-wrapper/` in Android Studio to build APK/AAB

### `platforms/electron-desktop/`
**Former location:** `electron-desktop/`

Electron desktop application shell for cross-platform desktop deployment.

- **Tech Stack:** Electron
- **Build:** `npm run build:desktop`
- **Output:** `dist/desktop/`

### `scripts/build/`
**Former location:** `build-scripts/`

Build and deployment scripts for mobile and desktop platforms.

**Contents:**
- `build_mobile.js` - Mobile build orchestration
- `build_desktop.js` - Desktop build orchestration
- `shell/` - Shell scripts for various build tasks
- `README.md` - Build scripts documentation

### `packages/`
**Former location:** `shared-packages/`

Shared TypeScript utilities and common code used across projects.

**Contents:**
- `ts-common/` - Common TypeScript utilities

### `docs/documentation/`
**Former location:** `documentation/`

All documentation including architecture diagrams, deployment guides, and operational procedures.

**Key Documents:**
- `architecture.md` - System architecture overview
- `deployment.md` - Deployment instructions
- `PERFORMANCE.md` - Performance optimization guidelines
- `troubleshooting.md` - Common issues and solutions
- `operations/` - Operational runbooks and release notes

### `config/misc/`
**Former location:** `misc/`

Miscellaneous root-level configuration files that don't belong to a specific project.

**Contents:**
- `.dockerignore` - Docker ignore patterns
- `.editorconfig` - Editor configuration
- `.env.example` - Environment variables template
- `docker-compose.yml` - Docker Compose configuration
- `Dockerfile` - Docker build configuration
- `eslint.config.js` - Root ESLint configuration
- `tsconfig.json` - Root TypeScript configuration
- `tsconfig.node.json` - Node-specific TypeScript configuration

## Root-Level Files

The following important files remain at the root level:

- `package.json` - Root package configuration and monorepo scripts
- `package-lock.json` - Lock file for dependencies
- `Makefile` - Common development commands
- `README.md` - Main project documentation
- `LICENSE` - Project license
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines
- `CODE_OF_CONDUCT.md` - Community guidelines
- `SECURITY.md` - Security policy
- `ROADMAP.md` - Project roadmap
- `FUTURE_WORK.md` - Deferred improvements
- `UPGRADEME.md` - Upgrade instructions
- `.gitignore` - Git ignore patterns

## Hidden Folders

- `.git/` - Git repository data
- `.github/` - GitHub-specific files (workflows, issue templates, agents)
- `.devcontainer/` - VS Code Dev Container configuration

## Migration Summary

| Old Path | New Path | Type |
|----------|----------|------|
| `frontend-app/` | `apps/frontend-app/` | Main React frontend |
| `web-app/` | `apps/web-app/` | Secondary React frontend |
| `nodejs-server/` | `services/nodejs-server/` | Node.js API server |
| `python-backend/` | `services/python-backend/` | Python backend |
| `android-wrapper/` | `platforms/android-wrapper/` | Android wrapper |
| `electron-desktop/` | `platforms/electron-desktop/` | Electron desktop |
| `build-scripts/` | `scripts/build/` | Build scripts |
| `shared-packages/` | `packages/` | Shared code |
| `documentation/` | `docs/documentation/` | Documentation |
| `misc/` | `config/misc/` | Config files |

## Updated Commands

All npm scripts in `package.json` and `Makefile` have been updated to reference the new paths. Common commands:

```bash
# Install all dependencies
npm run install:all

# Development
npm run dev:frontend    # Start apps/frontend-app
npm run dev:web         # Start apps/web-app
npm run dev:server      # Start services/nodejs-server
npm run dev:backend     # Start services/python-backend

# Building
npm run build           # Build all
npm run build:frontend  # Build apps/frontend-app
npm run build:web       # Build apps/web-app
npm run build:server    # Build services/nodejs-server
npm run build:mobile    # Build Android
npm run build:desktop   # Build Electron

# Testing
npm test               # Run all tests
npm run test:frontend  # Test apps/frontend-app
npm run test:web       # Test apps/web-app
npm run test:server    # Test services/nodejs-server
npm run test:e2e       # Test services/python-backend

# Code Quality
npm run lint           # Lint all projects
npm run typecheck      # TypeScript type checking
npm run validate       # Lint + typecheck + test
```

## Benefits of This Organization

1. **Clarity**: Each project has a clear, descriptive name that reflects its purpose
2. **Independence**: Projects are easier to extract and move to separate repositories
3. **Discoverability**: New contributors can quickly understand the structure
4. **Consistency**: Naming follows a clear pattern (descriptive + type)
5. **Organization**: Miscellaneous files are grouped together

## Future Considerations

This organization prepares the repository for potential future changes:

- Individual projects can be easily extracted into separate repositories
- Each project folder is self-contained with its own dependencies
- Clear boundaries between projects facilitate independent versioning
- Documentation and build scripts are centralized but not coupled to any single project

## Questions?

For questions about this reorganization or the repository structure, please:
1. Check the main [README.md](./README.md)
2. Review the [docs/documentation/](./docs/documentation/) folder
3. Open an issue on GitHub
