# Release Checklist

Use this list before tagging a release or cutting a build for any distribution channel.

## Code & quality gates
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test` (ensure coverage thresholds are met)
- [ ] `npm run test:e2e`
- [ ] `npm run build:web`
- [ ] `npm run build:mobile`
- [ ] `npm run build:desktop`

## Functional review
- [ ] Smoke-test agent creation, configuration, and memory dialogs.
- [ ] Validate workflow authoring (prebuilt + custom) across modern browsers.
- [ ] Confirm `/agents/:id` detail pages render populated state for recent agents.

## Documentation
- [ ] Update `docs/` with any new architecture or operations changes.
- [ ] Capture breaking changes or migrations in release notes.
- [ ] Double-check the README quickstart instructions.

## Operations
- [ ] Sync the mock dataset with production reality or mask new sensitive fields.
- [ ] Rotate API keys/secrets if the backend integration changed.
- [ ] Notify support + product channels with rollout timing and rollback plan.

