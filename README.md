# Android Agent Spark

A Vite + React + TypeScript project for experimenting with AI agent dashboards. It provides an interactive workspace to create, configure, and inspect agents across web, mobile, and desktop build targets.

## Features
- **Agent dashboard** with status, task metrics, and quick actions.
- Dialogs for **agent creation**, **configuration**, **memory** browsing, and **workflow** templates.
- Reusable UI kit built on [shadcn/ui](https://ui.shadcn.com) in `src/components/ui`.
- Utility hooks for mobile detection and toast notifications.

## Quickstart
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the mock API** in a separate terminal so the dashboard can hydrate agent data.
   ```bash
   npm run server
   ```
3. **Launch the Vite dev server** for the web client.
   ```bash
   npm run dev
   ```
4. **Run quality checks** whenever you touch the codebase.
   ```bash
   npm run lint        # static analysis
   npm run typecheck   # TypeScript validation
   npm test            # vitest component + integration suite with coverage
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

### Environment configuration

The frontend reads API locations from the `VITE_API_URL` environment variable. When omitted, it falls back to relative `/api`
requests which are proxied to `http://localhost:3001` during local development (see `vite.config.ts`). Set `VITE_API_URL`
when deploying the UI separately from the API, e.g.:

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

### Mobile & desktop bundles
- **Android:** `npm run bundle:android`
- **iOS:** `npm run bundle:ios`
- **Desktop shell:** `npm run bundle:desktop`

Each script sets `VITE_RUNTIME_TARGET` so the UI can adapt to the active platform and then runs the appropriate Capacitor/Tauri copy step. After bundling, use `npx cap sync <platform>` before opening the native project.

### Offline-first data
- Agent and workflow payloads are cached with IndexedDB on the web and Capacitor Preferences on native builds (`src/lib/offline-storage.ts`).
- The dashboard loads cached state immediately, falling back to it when the API is unreachable (`use-agents`, `use-workflows`).
- Saved workflows are available under the new **Saved** tab even while offline.

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

