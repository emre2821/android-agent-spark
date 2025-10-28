# Release Ops Log — 2024-11-07

## API persistence rollout
- Provision a writable volume for the Express API and point `AGENT_DB_PATH` at it so SQLite data outlives container restarts.【F:server/storage.js†L1-L68】
- Grant the same volume to `WORKFLOW_STORE_PATH` to persist workflow drafts, history, and exports. Back up the JSON snapshot before deploying.【F:server/workflowStore.js†L1-L60】
- Run `node server/index.js --check` in staging after setting `JWT_SECRET` to confirm the API starts, then verify `/auth/me` and `/agents` in the new workspace-aware routes respond with `200` for seeded accounts.【F:server/index.js†L40-L220】

## Credential + account hygiene
- Rotate any shared workspace passwords by updating the hashed credentials in `server/data.js` (`bcrypt` with cost 10).【F:server/data.js†L1-L80】
- Confirm each workspace has the correct role matrix before cutting the release so auth guards enforce the right access levels.【F:server/index.js†L80-L200】

## Deployment sequencing
- Promote the API first and watch WebSocket connection counts for churn (`/ws` should upgrade cleanly once the SPA reconnects).【F:server/index.js†L260-L360】
- Build the SPA with `npm run build:web` using `VITE_API_URL` pointed at the freshly deployed API origin so the client resolves the correct REST + WebSocket roots.【F:package.json†L1-L40】【F:src/lib/api/config.ts†L1-L46】
- For mobile/desktop bundles, rebuild with `npm run build:mobile` / `npm run build:desktop` and run `npx cap sync` to ship the updated runtime target and API base URL baked into the build.【F:package.json†L1-L60】

## Rollback plan
- Keep the previous `agents.db` and `workflows.json` snapshots on standby; restoring them and redeploying the prior API image reverts the persistence layer with minimal downtime.【F:server/storage.js†L1-L120】【F:server/workflowStore.js†L1-L120】
- Rebuild the SPA against the old API origin if rollback requires pointing clients at the earlier environment; publish via the CDN invalidate workflow after confirming the API is healthy.【F:src/lib/api/config.ts†L1-L46】
