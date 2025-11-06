# Release Notes

## Enhancements
- Agent updates, task activity, and memory edits now persist through the API layer so dashboards stay in sync across devices.
- Agent memory fetches, inserts, updates, and deletes use the live API with optimistic UI updates for a smoother editing flow.
- Mobile (`bundle:android` / `bundle:ios`) and desktop (`bundle:desktop`) bundles are explicitly labeled as preview builds while native shell integration is finalized.
- Introduced a feature flag (`VITE_ENABLE_CUSTOM_WORKFLOWS`) and a dedicated preview page so the workflow builder stays hidden until end-to-end persistence lands.【F:src/config/featureFlags.ts†L1-L20】【F:src/components/AgentDashboard.tsx†L27-L133】【F:src/pages/WorkflowsPreview.tsx†L1-L60】

## Deferred / Known Gaps
- Custom workflow tooling remains behind the preview gate; enable it by exporting `VITE_ENABLE_CUSTOM_WORKFLOWS=true` after storage work completes.【F:src/config/featureFlags.ts†L1-L20】【F:src/pages/WorkflowsPreview.tsx†L1-L60】
- Native shell wiring for Capacitor/Tauri packages is still pending; expect manual integration work before producing shippable binaries.【F:README.md†L107-L117】
## Highlights
- FastAPI now powers the Agent Spark backend with a dedicated CLI, APScheduler-driven automations, and SQLite persistence managed through SQLAlchemy models.【F:app/main.py†L1-L49】【F:app/cli.py†L1-L80】【F:app/engine/scheduler.py†L14-L38】【F:app/db/migrate.py†L1-L28】
- The dashboard moved under `web/` and uses React Router + React Query to surface agents, logs, generation controls, and vault exports against the new API surface.【F:web/src/App.tsx†L1-L31】【F:web/src/pages/Dashboard.tsx†L1-L46】【F:web/src/pages/Logs.tsx†L1-L48】【F:web/src/pages/Vault.tsx†L1-L43】

## Deferred / Known Gaps
- Native wrappers still need manual rebuilds after changing the API origin; use the CLI helper or shell script to produce APKs when distributing updates.【F:app/cli.py†L52-L80】【F:scripts/build_apk_debug.sh†L1-L40】
- Real-time collaboration/WebSocket features from the legacy stack are not yet ported to the FastAPI runtime.

## Unreleased
- Track follow-up items in `docs/release-checklist.md` as they are planned.

## 2025-11-05 — FastAPI Rebuild

### Features
- Replaced the Express runtime with a FastAPI application that boots via `python -m app.cli runserver`, seeds data through a lifecycle hook, and schedules background threadlight runs every fifteen minutes.【F:app/main.py†L15-L44】【F:app/cli.py†L10-L51】【F:app/engine/scheduler.py†L14-L38】
- Introduced modular routers for agents, rituals, quick posts, generation, and vault export, enabling the new React dashboard to hydrate its views via Axios/React Query with a configurable API base URL.【F:app/api/agents.py†L1-L47】【F:app/api/rituals.py†L1-L52】【F:app/api/posts.py†L1-L52】【F:app/api/generate.py†L1-L44】【F:app/api/vault.py†L1-L40】【F:web/src/lib/api.ts†L1-L5】【F:web/src/pages/Dashboard.tsx†L13-L45】
- Added CLI helpers for legacy vault import and Android wrapper builds so operators can complete migrations and package mobile shells without leaving the Python tooling.【F:app/cli.py†L34-L80】【F:app/db/legacy.py†L27-L67】

### Fixes
- Hardened the legacy vault importer to quarantine corrupt JSON payloads and keep migrations idempotent across concurrent startup attempts.【F:app/db/legacy.py†L27-L67】
- Added concurrency coverage around quick posts to ensure SQLite writes remain consistent when multiple requests arrive simultaneously.【F:tests/concurrency/test_quickpost_concurrency.py†L1-L90】【F:app/api/posts.py†L30-L52】

### Migrations
- Install Python dependencies (`pip install -r requirements.txt`), run `python -m app.cli import-legacy`, and start the server with `python -m app.cli runserver` to migrate from JSON stores into SQLite.【F:requirements.txt†L1-L11】【F:app/cli.py†L10-L51】【F:app/db/migrate.py†L1-L28】
- Set the new environment variables (`AGENT_SPARK_DB_PATH`, `AGENT_SPARK_API_KEY`, `AGENT_SPARK_DATA_DIR`, `AGENT_SPARK_SCHEDULER_ENABLED`) before deploying so security and storage controls stay aligned with production expectations.【F:app/config.py†L8-L28】【F:app/api/dependencies.py†L18-L31】
- Point the frontend at the FastAPI origin by exporting `VITE_API_BASE` (e.g. `/api` locally or `https://spark.example.com/api` in production) before running `npm --prefix web run build`. The Vite dev server proxy continues to rewrite `/api` to `http://127.0.0.1:8000` for local work.【F:web/src/lib/api.ts†L1-L5】【F:web/vite.config.ts†L5-L14】

## 2024-11-07 — Legacy Express Runtime

### Features
- **Workspace-aware authentication.** Added a full login flow with JWT issuance, workspace selection, and protected routing so dashboards only load data after a successful `/auth/login` + `/auth/me` handshake.【F:src/hooks/use-auth.tsx†L24-L140】【F:server/index.js†L40-L160】
- **Persistent agent runtime.** Express now stores agents, tasks, and memory items in SQLite, broadcasts mutations over `/ws`, and the React Query client listens for those events to keep dashboards live without refreshes.【F:server/storage.js†L1-L200】【F:server/index.js†L220-L420】【F:src/hooks/use-agents.tsx†L1-L260】
- **Workflow versioning.** A JSON-backed workflow store tracks drafts, publishes, diffs, and imports/exports so teams can manage revisions directly from the UI.【F:server/workflowStore.js†L1-L220】【F:src/hooks/use-workflows.tsx†L1-L140】
- **Run notifications & collaboration.** Live workflow run toasts and collaboration tooling plug into the shared WebSocket client so operators see streaming progress and presence updates in real time.【F:src/components/WorkflowRunNotifications.tsx†L1-L150】【F:src/lib/collaboration/collaborationClient.ts†L1-L200】

### Fixes
- Normalised API base resolution and WebSocket URL derivation so `VITE_API_URL` works across staging/prod without manual rewrites.【F:src/lib/api/config.ts†L1-L46】【F:src/hooks/use-agents.tsx†L60-L140】
- Restored provider wiring in `App.tsx`, ensuring QueryClient, auth, agents, and workflows contexts load exactly once around the router tree.【F:src/App.tsx†L1-L52】

### Migrations
- Install native dependencies (`better-sqlite3`) after pulling the release and ensure build tooling is available (Node 18+, Python 3, a C++ toolchain).【F:package.json†L1-L160】
- Configure new environment variables before deploying: `JWT_SECRET`, `AGENT_DB_PATH`, and `WORKFLOW_STORE_PATH` for the API plus `VITE_API_URL` for the SPA. Persist both the SQLite database and workflow JSON store across releases.【F:server/index.js†L40-L120】【F:server/storage.js†L1-L120】【F:server/workflowStore.js†L1-L80】【F:src/lib/api/config.ts†L1-L46】
- Re-run the README quickstart to seed local storage: `npm install`, `npm run server`, `npm run dev`, then sign in with one of the bundled sample accounts (e.g. `avery.owner@example.com` / `password123`).【F:README.md†L13-L70】【F:server/data.js†L1-L120】
