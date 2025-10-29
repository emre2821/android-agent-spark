# Release Notes

## Enhancements
- Agent updates, task activity, and memory edits now persist through the API layer so dashboards stay in sync across devices.
- Agent memory fetches, inserts, updates, and deletes use the live API with optimistic UI updates for a smoother editing flow.
- Mobile (`bundle:android` / `bundle:ios`) and desktop (`bundle:desktop`) bundles are explicitly labeled as preview builds while native shell integration is finalized.

## Deferred / Known Gaps
- The custom workflow builder and offline **Saved** tab remain hidden until end-to-end persistence is delivered. Prebuilt templates continue to function normally while persistence is implemented.【F:src/components/WorkflowDialog.tsx†L1003-L1110】
- Native shell wiring for Capacitor/Tauri packages is still pending; expect manual integration work before producing shippable binaries.【F:README.md†L107-L117】
## Unreleased
## 2024-11-07

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

## Unreleased
- Track follow-up items in `docs/release-checklist.md` as they are planned.
