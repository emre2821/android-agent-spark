# Android Agent Spark

A Vite + React + TypeScript project for experimenting with AI agent dashboards. It provides an interactive workspace to create, configure, and inspect agents across web, mobile, and desktop build targets.

## Features
- **Agent dashboard** with status, task metrics, and quick actions.
- Dialogs for **agent creation**, **configuration**, **memory** browsing, and **workflow** templates.
- Reusable UI kit built on [shadcn/ui](https://ui.shadcn.com) in `src/components/ui`.
- Utility hooks for mobile detection and toast notifications.

## Quickstart
1. **Install dependencies** (builds `better-sqlite3`, so expect native compilation on the first run).
   ```bash
   npm install
   ```
2. **Start the API + realtime server** in a separate terminal. This boots the Express app, SQLite persistence, and WebSocket gateway.
   ```bash
   npm run server
   ```
   The server listens on `http://localhost:3001` by default. Set `PORT`, `JWT_SECRET`, `AGENT_DB_PATH`, or `WORKFLOW_STORE_PATH` if you need to customise the runtime.【F:server/index.js†L1-L120】【F:server/storage.js†L1-L120】【F:server/workflowStore.js†L1-L60】
3. **Launch the Vite dev server** for the web client.
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/login` and sign in with one of the bundled sample accounts (for example `avery.owner@example.com` / `password123`).【F:src/pages/Login.tsx†L1-L80】
4. **Run quality checks** whenever you touch the codebase.
   ```bash
   npm run lint        # static analysis
   npm run typecheck   # TypeScript validation
   npm test            # Vitest component + integration suite with coverage thresholds
   npm run validate    # lint + typecheck + tests in a single command
   npm run test:e2e    # Cypress end-to-end flows (build + preview required)
   ```
5. **Build artifacts** for the different distribution targets.
   ```bash
   npm run build:web       # default production build
   npm run build:mobile    # Capacitor-friendly bundle
   npm run build:desktop   # desktop-targeted bundle
   ```
## Getting Started
### Prerequisites
- Node.js 18+
- npm 10+
- Python 3 and a C/C++ toolchain (needed the first time `better-sqlite3` compiles)

### Installation
```bash
npm install
```

### Development server
```bash
npm run dev
```

### API server
```bash
npm run server
```

The server issues JWTs, stores agents in SQLite, and exposes `/ws` for live updates. Override defaults with:

```bash
PORT=4000 \
JWT_SECRET="change-me" \
AGENT_DB_PATH="/var/lib/spark/agents.db" \
WORKFLOW_STORE_PATH="/var/lib/spark/workflows.json" \
npm run server
```

Sample credentials for local testing:

| Role | Email | Password |
|------|-------|----------|
| Owner/Admin | `avery.owner@example.com` | `password123` |
| Admin | `bailey.admin@example.com` | `password123` |
| Editor | `casey.editor@example.com` | `password123` |
| Viewer | `devon.viewer@example.com` | `password123` |

### Environment variables
- `VITE_API_URL` &mdash; optional HTTP base URL for the agent API. When unset the app targets `http://localhost:3001` for both REST and WebSocket traffic. Set it to the fully qualified API origin (e.g. `https://spark.example.com/api`).【F:src/lib/api/config.ts†L1-L40】
### Environment configuration

The frontend reads API locations from the `VITE_API_URL` environment variable. When omitted, it falls back to `http://localhost:3001` (matching the default Express server). For staging/production builds, point it at the deployed API origin so REST and WebSocket calls resolve correctly. For example:

```bash
VITE_API_URL="https://spark.example.com/api" npm run build
```

### Production build
```bash
npm run build
```

### Testing
```bash
npm run test
```

Run the Vitest suite once in CI/automation contexts. For watch mode during development use `npm run test:watch`.

### Type checking
```bash
npm run typecheck
```

Performs a project-wide TypeScript compilation pass without emitting build artifacts.

### Validation bundle
```bash
npm run validate
```

Chains linting, type checking, and the Vitest run to mirror the local checks expected before pushing changes.

### Mobile & desktop bundles (preview-only)
- **Android:** `npm run bundle:android`
- **iOS:** `npm run bundle:ios`
- **Desktop shell:** `npm run bundle:desktop`

Each script sets `VITE_RUNTIME_TARGET` so the UI can adapt to the active platform and then runs the appropriate Capacitor/Tauri copy step. After bundling, use `npx cap sync <platform>` before opening the native project.

> **Preview notice:** The generated bundles are intentionally labeled preview-only. They package the web assets but still need manual shell wiring (Android Studio/Xcode/Electron Builder) before shippable binaries can be produced.

### Offline-first data
- Agent and workflow payloads are cached with IndexedDB on the web and Capacitor Preferences on native builds (`src/lib/offline-storage.ts`).
- The dashboard loads cached state immediately, falling back to it when the API is unreachable (`use-agents`, `use-workflows`).
- Saved-workflow caching is temporarily disabled in the UI until the persistence APIs are finalized.

### Native plugin requirements
Install these Capacitor plugins in the native shells to unlock mobile capabilities:

- `@capacitor/preferences` – persistent key/value cache.
- `@capacitor/push-notifications` & `@capacitor/local-notifications` – surface workflow alerts.
- `@capacitor/background-task` – background sync for workflows.

Update `android/app/src/main/AndroidManifest.xml` and `ios/App/App/Info.plist` with the appropriate notification/background permissions.

### Desktop runtime evaluation
The desktop build targets a Tauri (or Capacitor Desktop) wrapper that loads the same Vite bundle. The workflow dialog exposes optional filesystem/webhook bridges that are only toggleable when `VITE_RUNTIME_TARGET=desktop`. Wire these toggles to the native side to connect file watchers and webhook relays.

### Linting
```bash
npm run lint
```

## Project Structure
```
src/
  main.tsx           # application entry
  pages/             # page-level components and routing
  components/        # dashboard, dialogs, and shared UI elements
  hooks/             # custom React hooks
  lib/               # utility helpers
```

## Documentation
- [Architecture overview](docs/architecture.md)
- [Node authoring guide](docs/node-authoring.md)
- [Deployment playbook](docs/deployment.md)
- [Troubleshooting reference](docs/troubleshooting.md)
- [Release checklist](docs/release-checklist.md)
- [Contributing guidelines](CONTRIBUTING.md)

## Next Steps
- Persist agent updates back to the API and expand endpoints.
- Add real storage for custom workflows and memory items.
- Wire the mobile/desktop bundles into their respective Capacitor shells.
- Expand the orchestration API with authentication, multi-tenant workspaces, and execution metrics.
- Connect the desktop bridge toggles to native filesystem/webhook handlers.
- Add tests and expand routing beyond the dashboard.

