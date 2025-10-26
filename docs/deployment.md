# Deployment Playbook

## Overview
Android Agent Spark now ships as a coordinated web client + API bundle. The React SPA is still packaged with Vite, while the Express backend persists data in SQLite, manages JWT-authenticated workspaces, and exposes a WebSocket channel for live updates. This guide outlines how to promote both parts safely.

## Environments
| Environment | Purpose | Commands |
|-------------|---------|----------|
| **Local**   | Developer sandbox with the bundled Express API. | `npm run server` (starts the API + WebSocket gateway on port 3001) in one terminal and `npm run dev` in another. |
| **Staging** | Pre-release validation with shared databases and integrations. | Build the SPA with `npm run build:web`, serve `dist/` behind a reverse proxy that forwards `/api` and `/ws` to the staging API, and seed the API with representative workspaces. |
| **Production** | User-facing deployment. | `npm run build:web` for static assets, `node server/index.js` (or your container process manager) for the API. Ensure `/ws` is proxied with WebSocket support and point the SPA at the production API via `VITE_API_URL`. |

## Build targets
- **Web:** `npm run build:web` emits `dist/`. Smoke-test with `npm run preview -- --host 0.0.0.0 --port 4173` before publishing.
- **Mobile:** `npm run build:mobile` prepares `dist-mobile/` for Capacitor. Run `npx cap sync ios|android` afterward to update native shells.
- **Desktop:** `npm run build:desktop` outputs `dist-desktop/` and can be wrapped with Electron using `npm run desktop:build`.

## API deployment
- The Express server listens on `PORT` (defaults to `3001`) and requires a `JWT_SECRET` for signing login tokens. Provide a strong secret outside of development.【F:server/index.js†L1-L120】
- Agent/task/memory data is stored in SQLite at `AGENT_DB_PATH` (defaults to `server/data/agents.db`). Mount persistent storage or direct the path to managed disk when deploying containers.【F:server/storage.js†L1-L120】
- Workflow drafts and history are written to JSON at `WORKFLOW_STORE_PATH` (defaults to `server/data/workflows.json`). Back up this file or point it at durable storage in hosted environments.【F:server/workflowStore.js†L1-L60】
- Expose the `/ws` route with WebSocket upgrades enabled so dashboards receive live updates. When fronting the API with nginx or a load balancer, include `Upgrade`/`Connection` headers in the proxy rules.【F:server/index.js†L200-L320】

## Client configuration
- `VITE_API_URL` controls where the SPA sends REST and WebSocket traffic. Set it to the fully qualified API origin (e.g. `https://spark.example.com/api`) before running the build. The runtime automatically normalizes trailing slashes and converts the scheme for WebSocket connections.【F:src/lib/api/config.ts†L1-L40】
- For packaged mobile/desktop builds, bake the correct API URL into the environment and ship updated Capacitor/Electron binaries alongside the web release.

## Continuous delivery
- Automation should run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e` before publishing artefacts. The `npm run validate` script chains the first three commands to simplify local verification.【F:package.json†L1-L120】
- Build and push the API container/image in lockstep with the SPA to keep contracts in sync. Once the new version is healthy, roll traffic by environment (staging → production) and monitor WebSocket connection counts for regressions.

## Release cadence
1. Complete the [release checklist](release-checklist.md) before tagging.
2. Publish the SPA bundle, roll out the Express API (or equivalent service), and sync mobile/desktop packages if applicable.
3. Share release notes with migration steps, especially when auth, database paths, or workflow schemas change.

