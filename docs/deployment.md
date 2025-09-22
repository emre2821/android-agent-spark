# Deployment Playbook

## Overview
Android Agent Spark ships as a Vite SPA and can be packaged for multiple runtimes. This guide walks through the build artefacts, environment configuration, and promotion flow.

## Environments
| Environment | Purpose | Commands |
|-------------|---------|----------|
| **Local**   | Developer sandbox with mock data. | `npm run server` + `npm run dev` |
| **Staging** | Pre-release validation with real integrations. | `npm run build:web` and host `dist/` on a static server. Point the API URL at staging services. |
| **Production** | User-facing deployment. | `npm run build:web` with production `.env`. Serve assets via CDN and wire the API to the production orchestrator. |

## Build targets
- **Web:** `npm run build:web` generates `dist/` for any static host. Use `npm run preview -- --host 0.0.0.0 --port 4173` for a smoke-test before shipping.
- **Mobile:** `npm run build:mobile` writes a `dist-mobile/` bundle tuned for Capacitor. Follow it with `npx cap sync ios` / `android` inside a native toolchain.
- **Desktop:** `npm run build:desktop` produces `dist-desktop/`, making it easy to wrap with Tauri or Electron.

## Environment variables
Create an `.env` (or `.env.production`) file with:

```
VITE_API_URL=https://api.example.com
```

Update `src/hooks/use-agents.tsx` to read from `import.meta.env.VITE_API_URL` when wiring real infrastructure.

## Continuous Integration
`.github/workflows/ci.yml` executes linting, unit/integration tests with coverage, Cypress E2E runs, type-checking, and all three build targets on every pull request. Keep the pipeline green before merging.

## Release cadence
1. Run through the [release checklist](release-checklist.md) before tagging.
2. Publish the web bundle and push mobile/desktop builds to their respective stores.
3. Announce release notes with any migration steps, especially when workflow schemas or API contracts change.

