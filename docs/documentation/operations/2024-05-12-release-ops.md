# Release Ops Log — 2024-05-12

## Mock data refresh
- Synced `services/nodejs-server/data/db.json`, `services/nodejs-server/data/workflows.json`, and `services/nodejs-server/data/workflowRuns.json` with the latest production schema.
- Masked customer-facing identifiers (tickets, channels, payloads) using surrogate tokens and descriptive placeholders.
- Preserved owner and workspace references so local testing mirrors production permissions.

## Credential rotation
- Regenerated the Zendesk sandbox token used by `agent-cobalt-sentinel` and `wf-cobalt-escalation` test runs.
  - Old token revoked at 2024-05-10T19:05Z.
  - New token `ZENDESK_SANDBOX_TOKEN` stored in 1Password vault `Spark / Sandboxes` (item: `Zendesk Sandbox Token — 2024-05-12`).
- Verified that no other third-party credentials were touched in this release.

## Comms and rollback
- Scheduled deployment window: 2024-05-13 17:00–17:30 UTC.
- Rollback plan: redeploy previous web bundle (`release/2024-05-05`) and restore mock data snapshot tagged `mockdata-2024-05-05`.
- Notifications sent 2024-05-12 15:30 UTC:
  - `#spark-support` Slack channel — deployment window, feature summary, rollback contact.
  - `#spark-product` Slack channel — feature highlights, QA sign-off, rollback steps.

