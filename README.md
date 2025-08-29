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

### Production build
```bash
npm run build
```

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
- Persist agent updates back to the API and expand endpoints.
- Add tests and expand routing beyond the dashboard.
- Explore [Capacitor](https://capacitorjs.com/) targets for mobile deployment.

