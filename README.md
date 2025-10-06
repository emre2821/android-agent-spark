# Android Agent Spark

A Vite + React + TypeScript project for experimenting with AI agent dashboards. It provides an interactive workspace to create, configure, and inspect agents.

## Features
- **Agent dashboard** with status, task metrics, and quick actions.
- Dialogs for **agent creation**, **configuration**, **memory** browsing, and **workflow** templates.
- Reusable UI kit built on [shadcn/ui](https://ui.shadcn.com) in `src/components/ui`.
- Utility hooks for mobile detection and toast notifications.

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

## Next Steps
- Expand the orchestration API with authentication, multi-tenant workspaces, and execution metrics.
- Connect the desktop bridge toggles to native filesystem/webhook handlers.
- Add tests and expand routing beyond the dashboard.

