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

