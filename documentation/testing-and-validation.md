# Testing and Validation

This project spans a Python backend and a TypeScript frontend. Run both test suites before you ship a change or cut a release.

## Python backend
- **Unit & integration tests:** `pytest` exercises FastAPI routes, the legacy vault importer, and concurrency handling around quick posts.【F:tests/backend/test_api.py†L1-L120】【F:tests/backend/test_migration.py†L1-L80】【F:tests/concurrency/test_quickpost_concurrency.py†L1-L90】
- **Linting & formatting:** We rely on the standard library `logging` + type hints; use your preferred tooling (e.g. `ruff`, `black`, `mypy`) locally. No pinned linters ship in this repo yet, so document any additional checks you run when opening a PR.

## Frontend (Vite + React)
- **Linting:** `npm --prefix web run lint` mirrors the ESLint configuration executed by CI.【F:web/package.json†L1-L22】
- **Type safety & build:** `npm --prefix web run build` compiles the SPA and runs TypeScript checks. Follow with `npm --prefix web run preview -- --host 0.0.0.0 --port 4173` for a smoke test of the production build.【F:web/package.json†L1-L22】

## Suggested workflow
1. Activate your Python virtualenv and install dependencies via `pip install -r requirements.txt`.
2. Install frontend dependencies with `npm --prefix web install` (or `npm install` at the repository root if you prefer).
3. Develop with `python -m app.cli runserver --reload` alongside `npm --prefix web run dev`.
4. Before pushing, run `pytest` and `npm --prefix web run lint`.
5. For release candidates, add the full bundle: `pytest`, `npm --prefix web run lint`, and `npm --prefix web run build`.
