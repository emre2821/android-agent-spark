# Release Ops Log — 2025-11-05

## Backend rebuild rollout
- Provision a writable volume for the new SQLite database and point `AGENT_SPARK_DB_PATH` at it so FastAPI instances share the same state across restarts.【F:services/python-backend/app/config.py†L10-L22】【F:services/python-backend/app/db/session.py†L11-L24】
- Run `python -m app.cli import-legacy` once per environment to migrate any lingering `vault.json` files into SQLite before cutting traffic over.【F:services/python-backend/app/cli.py†L34-L51】【F:services/python-backend/app/db/legacy.py†L27-L67】
- Disable the background scheduler (`AGENT_SPARK_SCHEDULER_ENABLED=false`) on secondary replicas until after validation, then re-enable to avoid duplicate threadlight runs.【F:services/python-backend/app/config.py†L17-L28】【F:services/python-backend/app/engine/scheduler.py†L14-L38】

## Credential and API key hygiene
- Generate a fresh `AGENT_SPARK_API_KEY`, store it in the shared secret manager, and distribute it to frontend/mobile build pipelines. The backend rejects mutating requests that lack the header once `AGENT_SPARK_DEV_MODE` is false.【F:services/python-backend/app/config.py†L8-L24】【F:services/python-backend/app/api/dependencies.py†L18-L31】
- Document where the new key lives (secret manager path + owner) and schedule a reminder to rotate it every quarter.

## Deployment sequencing
- Deploy the FastAPI service first, monitoring `/health` and the scheduler logs to confirm startup migrations succeeded.【F:services/python-backend/app/main.py†L15-L44】【F:services/python-backend/app/engine/scheduler.py†L14-L38】
- Build the SPA with `VITE_API_BASE` set to the production origin and publish `apps/web-app/dist` via the CDN. Validate dashboard pages (Agents, Logs, Generate, Vault) against the new API.【F:apps/web-app/src/lib/api.ts†L1-L5】【F:apps/web-app/src/pages/Dashboard.tsx†L1-L46】【F:apps/web-app/src/pages/Logs.tsx†L1-L48】【F:apps/web-app/src/pages/Generate.tsx†L1-L60】
- Rebuild the Android wrapper with the updated base URL using `python -m app.cli build-apk-helper` and push the artefact to testers.【F:services/python-backend/app/cli.py†L52-L80】

## Rollback plan
- Keep the previous `data/agent_spark.db` snapshot plus the legacy `vault.json` backup. Reverting the environment variable to the old image and restoring these files returns the system to the Express runtime baseline.【F:services/python-backend/app/config.py†L10-L28】【F:services/python-backend/app/db/legacy.py†L27-L67】
- If the scheduler causes issues, disable it via `AGENT_SPARK_SCHEDULER_ENABLED=false` and redeploy while investigating.【F:services/python-backend/app/config.py†L17-L28】【F:services/python-backend/app/engine/scheduler.py†L14-L38】
- Announce rollback completion in support/product channels and capture timelines in this log.
