# Repository Organization

This document describes the new organized structure of the Android Agent Spark repository.

## Overview

The repository has been reorganized into dedicated project folders to improve clarity and make it easier to extract individual projects in the future. Each major component now has its own clearly-named folder at the root level.

## Project Folders

### `frontend-app/`
**Former location:** `apps/frontend/`

The main React/TypeScript frontend application built with Vite. This is the primary user interface for the Agent Spark system.

- **Tech Stack:** React 18, TypeScript, Vite, TailwindCSS
- **Build:** `npm --prefix frontend-app run build`
- **Dev Server:** `npm --prefix frontend-app run dev`
- **Tests:** `npm --prefix frontend-app run test`

### `web-app/`
**Former location:** `web/`

Secondary web frontend application, also built with React and Vite.

- **Tech Stack:** React, TypeScript, Vite
- **Build:** `npm --prefix web-app run build`
- **Dev Server:** `npm --prefix web-app run dev`
- **Tests:** `npm --prefix web-app run test`

### `nodejs-server/`
**Former location:** `server/`

Node.js API server providing backend services for the Agent Spark system.

- **Tech Stack:** Node.js, Express, WebSocket, SQLite
- **Start:** `npm --prefix nodejs-server run dev`
- **Tests:** `npm --prefix nodejs-server run test`
- **Port:** 3001 (default)

### `python-backend/`
**Former location:** `scripts/python/`

Python backend application providing additional API services and background automation.

- **Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy
- **Setup:** `cd python-backend && pip install -r requirements.txt`
- **Start:** `cd python-backend && python -m app.cli runserver --host 0.0.0.0 --port 8000`
- **Tests:** `cd python-backend && pytest`
- **Port:** 8000 (default)

### `android-wrapper/`
**Former location:** `android-wrapper/` (unchanged)

Capacitor-based Android application wrapper.

- **Tech Stack:** Capacitor, Android/Kotlin
- **Build:** `npm run build:mobile && npx cap sync android`
- **Location:** Open `android-wrapper/` in Android Studio to build APK/AAB

### `electron-desktop/`
**Former location:** `electron/`

Electron desktop application shell for cross-platform desktop deployment.

- **Tech Stack:** Electron
- **Build:** `npm run build:desktop`
- **Output:** `dist/desktop/`

### `build-scripts/`
**Former location:** `scripts/`

Build and deployment scripts for mobile and desktop platforms.

**Contents:**
- `build_mobile.js` - Mobile build orchestration
- `build_desktop.js` - Desktop build orchestration
- `shell/` - Shell scripts for various build tasks
- `README.md` - Build scripts documentation

### `shared-packages/`
**Former location:** `packages/`

Shared TypeScript utilities and common code used across projects.

**Contents:**
- `ts-common/` - Common TypeScript utilities

### `documentation/`
**Former location:** `docs/`

All documentation including architecture diagrams, deployment guides, and operational procedures.

**Key Documents:**
- `architecture.md` - System architecture overview
- `deployment.md` - Deployment instructions
- `PERFORMANCE.md` - Performance optimization guidelines
- `troubleshooting.md` - Common issues and solutions
- `operations/` - Operational runbooks and release notes

### `misc/`
**New folder for standalone configuration files**

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
| `apps/frontend/` | `frontend-app/` | Main React frontend |
| `web/` | `web-app/` | Secondary React frontend |
| `server/` | `nodejs-server/` | Node.js API server |
| `scripts/python/` | `python-backend/` | Python backend |
| `electron/` | `electron-desktop/` | Electron desktop |
| `scripts/` | `build-scripts/` | Build scripts |
| `packages/` | `shared-packages/` | Shared code |
| `docs/` | `documentation/` | Documentation |
| (various) | `misc/` | Config files |

## Updated Commands

All npm scripts in `package.json` and `Makefile` have been updated to reference the new paths. Common commands:

```bash
# Install all dependencies
npm run install:all

# Development
npm run dev:frontend    # Start frontend-app
npm run dev:web         # Start web-app
npm run dev:server      # Start nodejs-server
npm run dev:backend     # Start python-backend

# Building
npm run build           # Build all
npm run build:frontend  # Build frontend-app
npm run build:web       # Build web-app
npm run build:server    # Build nodejs-server
npm run build:mobile    # Build Android
npm run build:desktop   # Build Electron

# Testing
npm test               # Run all tests
npm run test:frontend  # Test frontend-app
npm run test:web       # Test web-app
npm run test:server    # Test nodejs-server
npm run test:e2e       # Test python-backend

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
2. Review the [documentation/](./documentation/) folder
3. Open an issue on GitHub
