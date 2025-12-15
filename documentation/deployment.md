# Deployment Guide

## Overview
Agent Spark now deploys as a FastAPI service with a companion Vite/React single-page app. The backend exposes REST endpoints for agents, rituals, quick posts, generation, and vault management, while the frontend consumes those endpoints via a lightweight Axios client. Background automation (the threadlight generator) runs on the server through APScheduler and persists output in SQLite.【F:app/main.py†L15-L44】【F:app/api/agents.py†L1-L47】【F:app/api/posts.py†L1-L52】【F:app/api/generate.py†L1-L44】【F:web-app/src/lib/api.ts†L1-L5】【F:app/engine/scheduler.py†L14-L38】

## Environments
| Environment | Purpose | Commands |
|-------------|---------|----------|
| **Local** | Developer sandbox running FastAPI with live reload and the Vite dev server. | Activate your virtualenv, then `python -m app.cli runserver --reload --host 0.0.0.0 --port 8000` in one shell and `npm --prefix web-app run dev` in another. |
| **Staging** | Pre-release validation against shared SQLite volumes or managed databases. | Run migrations with `python -m app.cli import-legacy` (idempotent), launch uvicorn (`python -m app.cli runserver --host 0.0.0.0 --port 8000`), and serve the built SPA with a reverse proxy that forwards `/api` to the backend. |
| **Production** | User-facing deployment. | Package the API with your process manager of choice (`uvicorn app.main:app --host 0.0.0.0 --port 8000`) and host the compiled `web-app/dist` assets behind a CDN or static site host. Ensure the proxy exposes `/api` and `/health`. |

## Build targets
- **Web SPA:** `npm --prefix web-app run build` emits `web-app/dist`. Smoke-test with `npm --prefix web-app run preview -- --host 0.0.0.0 --port 4173` before publishing.【F:web-app/package.json†L1-L22】
- **Android wrapper:** Use `python -m app.cli build-apk-helper` (or run `scripts/build_apk_debug.sh` directly) after updating the API base URL inside the wrapper configuration.【F:app/cli.py†L52-L80】【F:scripts/build_apk_debug.sh†L1-L40】

## API deployment
- FastAPI defaults to port `8000`. Override with `--port` or set `PORT` when invoking uvicorn. The CLI uses `app.config.Settings` so environment variables like `AGENT_SPARK_DB_PATH`, `AGENT_SPARK_DATA_DIR`, and `AGENT_SPARK_SCHEDULER_ENABLED` take effect automatically.【F:app/cli.py†L10-L33】【F:app/config.py†L8-L28】
- Provide a writable directory for the SQLite database; the default path is `data/agent_spark.db`. The settings helper creates parent directories if they do not exist.【F:app/config.py†L10-L22】【F:app/db/session.py†L11-L24】
- Set `AGENT_SPARK_API_KEY` and disable `AGENT_SPARK_DEV_MODE` in non-development environments to require the `X-API-Key` header on all mutating routes.【F:app/config.py†L10-L24】【F:app/api/dependencies.py†L18-L31】
- When migrating from legacy installations, place `vault.json` under `data/` (or point `AGENT_SPARK_LEGACY_VAULT_PATH` elsewhere) and run `python -m app.cli import-legacy` prior to exposing the API.【F:app/db/legacy.py†L27-L67】【F:app/cli.py†L34-L51】
- The background scheduler can be disabled by setting `AGENT_SPARK_SCHEDULER_ENABLED=false` if workers should remain idle in certain environments.【F:app/config.py†L17-L28】【F:app/engine/scheduler.py†L14-L38】

## Client configuration
- Set `VITE_API_BASE` before building the SPA so Axios resolves to the correct API origin (e.g. `https://spark.example.com/api`). During local development the Vite proxy rewrites `/api` calls to `http://127.0.0.1:8000`.【F:web-app/src/lib/api.ts†L1-L5】【F:web-app/vite.config.ts†L5-L14】
- Mobile or desktop wrappers should mirror the same base URL and include the API key header when issuing mutating requests.

## Continuous delivery
- Run `pytest` to execute backend unit tests, migration checks, and concurrency guards.【F:tests/backend/test_api.py†L1-L120】【F:tests/backend/test_migration.py†L1-L80】【F:tests/concurrency/test_quickpost_concurrency.py†L1-L90】
- Lint and type-check the frontend with `npm --prefix web-app run lint` and `npm --prefix web-app run build` (Vite invokes TypeScript during the build step).【F:web-app/package.json†L1-L22】
- Package artefacts only after the steps above succeed and archive the resulting `web-app/dist` and database backups as part of the release bundle.

## Release cadence
1. Complete the [release checklist](release-checklist.md) before tagging.
2. Publish the SPA, roll out the FastAPI service (with migrations and scheduler configuration), and rebuild the Android wrapper if distributing mobile artifacts.
3. Share release notes with migration steps, especially when environment variables, API keys, or database schemas change.
