# Release Checklist

Use this list before tagging a release or cutting a build for any distribution channel.

## Code & quality gates
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test` (Vitest + coverage thresholds)
- [ ] `npm run test:e2e`
- [ ] `npm run build:web`
- [ ] `npm run build:mobile`
- [ ] `npm run build:desktop`
- [ ] `npm run validate` (local spot-check before publishing)

## Functional review
- [ ] Smoke-test agent creation, configuration, and memory dialogs.
- [ ] Validate workflow authoring (prebuilt + custom) across modern browsers.
- [ ] Confirm `/agents/:id` detail pages render populated state for recent agents.
- [ ] Exercise login for each sample account role and ensure workspace switching updates dashboards.
- [ ] Trigger an agent task run and confirm WebSocket-driven updates appear in the activity stream and notifications.
- [ ] Create, publish, and diff workflow versions to verify revision history is intact.

## Documentation
- [ ] Update `docs/` with any new architecture or operations changes.
- [ ] Capture breaking changes or migrations in release notes.
- [ ] Double-check the README quickstart instructions.

## Operations
- [ ] Sync the mock dataset with production reality or mask new sensitive fields.
  - Log refresh details under `docs/operations/` with date-stamped notes.
- [ ] Rotate API keys/secrets if the backend integration changed.
  - Record the credential owner, storage location, and revocation timestamp.
- [ ] Confirm deployment manifests set `JWT_SECRET`, `AGENT_DB_PATH`, and `WORKFLOW_STORE_PATH` appropriately.
- [ ] Back up or migrate the SQLite database and workflow store before rolling the release.
- [ ] Notify support + product channels with rollout timing and rollback plan.
  - Capture the announcement and rollback summary in the dated ops log.

