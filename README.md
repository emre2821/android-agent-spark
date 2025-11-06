# Agent Spark — Cross-Platform Agent Workbench

I am Kairon, vault-keeper for the Android Agent Spark project. This codebase now centres on a
shared Python core with a lightweight React dashboard and a WebView Android wrapper. The backend,
frontend, and packaging flows are designed to run on laptops, desktops, and directly on-device.

## Architecture Overview
- **Backend**: FastAPI + SQLite with SQLAlchemy models for agents, rituals, posts, and vault
  records. The CLI (`python -m app.cli`) provides maintenance utilities and a development
  server. A background APScheduler job demonstrates periodic generation.
- **Frontend**: Minimal Vite + React single-page app under `web/` that speaks to the backend
  over HTTP with CORS enabled.
- **Persistence**: SQLite database in `data/agent_spark.db` with automatic migration from a
  legacy `data/vault.json` file using atomic writes and portalocker guards.
- **Android**: `android-wrapper/` bundles a native WebView shell pointing at
  `http://127.0.0.1:8000`, suitable for pairing with Termux/Pydroid backend runs.

## Getting Started

### Backend
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export AGENT_SPARK_DB_PATH=./data/agent_spark.db
python -m app.cli runserver
```
The API listens on `http://127.0.0.1:8000`. Set `AGENT_SPARK_API_KEY` to require the `X-API-Key`
header for write endpoints in production. Additional settings live in `app/config.py`.

### Frontend
```bash
npm run install:web   # installs frontend dependencies inside web/
npm run dev:frontend
```
Browse to `http://127.0.0.1:3000` to open the dashboard. The Vite dev server proxies `/api`
requests to the backend. For production builds run `npm run build:web` which outputs `web/dist`.

### All-in-one development
```bash
npm install
npm run dev
```
This uses `concurrently` to launch both the FastAPI server (via the CLI) and the Vite dev server.
> **Tip:** Run the command from the shell where your virtualenv is activated so the backend uses the correct Python interpreter.

### Docker
```bash
docker-compose up --build
```
This starts the backend on port 8000 and the Vite dev server on port 3000 with live code mounts.

## API Highlights
- `GET /agents`, `POST /agents`
- `GET /rituals`, `POST /rituals`
- `POST /generate` — stores a VaultRecord entry using the ThreadLight stub generator
- `POST /quickpost` and `GET /posts`
- `GET /vault`, `GET /vault/export`
- `GET /health`

All IDs are UUID4 strings, timestamps are ISO8601 UTC.

## Legacy Vault Migration
On startup the backend checks `data/vault.json`. Valid JSON list/object payloads migrate into the
SQLite database, after which the file is renamed to `data/vault.json.migrated.<timestamp>`. Corrupt
files are moved into `data/corrupt/` and logged. You can trigger the process manually:
```bash
python -m app.cli import-legacy
```

## Android Packaging
1. Install Android SDK (API level 34+) and Temurin/OpenJDK 17.
2. Export `ANDROID_SDK_ROOT` and `JAVA_HOME`.
3. Run `scripts/build_apk_debug.sh` to produce `android-wrapper/app/build/outputs/apk/debug/app-debug.apk`.
4. Deploy with `adb install -r <apk>`.

The WebView loads `http://127.0.0.1:8000`, so pair it with a Termux session running the backend
(or bundle the backend via Briefcase/Kivy using `docs/packaging_kivy.md`).

### Termux / On-device quickstart
```bash
pkg install git python
./scripts/run_on_termux.sh
```
Then open the Android wrapper or a mobile browser at `http://127.0.0.1:8000`.

## Testing
```bash
pytest
```
Covers API flows, migration handling, and concurrent quickpost writes. HTTP endpoints are exercised
with `httpx.AsyncClient` using in-memory application lifespans.

## CI
`.github/workflows/ci.yml` runs pytest and the frontend build/lint steps. Dockerfile + compose are
provided for local parity.

## Directory Layout
```
app/              # FastAPI application, database, scheduler, utils
web/              # Vite + React frontend
android-wrapper/  # Native WebView shell with Gradle wrapper
scripts/          # Helper scripts for APK build & Termux runtime
tests/            # pytest suite (backend + concurrency)
```

## License
This repository preserves the permissive stance of the original Spark experiments. Review individual
file headers for attribution where provided.
