# Release Checklist

Use this list before tagging a release or cutting a build for any distribution channel.

## Code & quality gates
- [ ] Backend tests: `pytest`
- [ ] Frontend lint: `npm --prefix web run lint`
- [ ] Frontend build & type check: `npm --prefix web run build`

## Functional review
- [ ] Launch the FastAPI server via `python -m app.cli runserver --reload` and confirm `/health` responds with `200`.
- [ ] Create an agent through the UI (requires setting `AGENT_SPARK_API_KEY` or running in dev mode) and verify it appears on the dashboard list.
- [ ] Exercise ritual logging and quick post creation to confirm new records surface immediately on the Logs and Vault pages.
- [ ] Run the threadlight generator (trigger `/generate` or wait for the scheduler) and check that new vault entries export correctly via `/vault/export`.

## Documentation
- [ ] Update `docs/` with any new architecture, API, or operations changes.
- [ ] Capture breaking changes or migrations in release notes.
- [ ] Double-check the README quickstart instructions.

## Operations
- [ ] Confirm deployment manifests set `AGENT_SPARK_DB_PATH`, `AGENT_SPARK_API_KEY`, `AGENT_SPARK_DATA_DIR`, and `AGENT_SPARK_SCHEDULER_ENABLED` appropriately.【F:app/config.py†L8-L28】【F:app/api/dependencies.py†L18-L31】
- [ ] Back up or migrate the SQLite database (`data/agent_spark.db`) and any legacy vault files before rolling the release.【F:app/config.py†L10-L28】【F:app/db/legacy.py†L27-L67】
- [ ] Rotate API keys/secrets if the backend integration changed and document storage locations.
- [ ] Notify support + product channels with rollout timing and rollback plan. Capture notes in a dated ops log under `docs/operations/`.
