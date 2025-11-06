# Release Ops Log — 2024-11-09

## Mock data refresh
- Synced `server/data/db.json`, `server/data/workflows.json`, and `server/data/workflowRuns.json` with the 2024-11-08 production snapshots.
- Verified masking profile v4 everywhere customer identifiers surface (logs, payloads, channel references) and added explicit retention policies for each memory record.
- Captured new workflow revisions (`ver-aurora-qualification-3`, `ver-cobalt-escalation-4`, `ver-lumen-prompt-forge-2`) so local regression tests mirror production history.
- Confirmed integration health flags represent current sandbox state while keeping provider tokens masked.

## Credential rotation
- Updated default development secrets:
  - `JWT_SECRET`: `dev-secret-20241109`
  - `CREDENTIALS_SECRET`: `development-secret-key-20241109`
- Production operators must provision fresh secrets before deploy:
  - `export JWT_SECRET="<random-64-char-string>"`
  - `export CREDENTIALS_SECRET="<random-32-byte-hex>"`
- New secrets stored in 1Password vault `Spark / Sandboxes` (item: `Workspace API Secrets — 2024-11-09`). Prior entries revoked at 2024-11-09T14:10Z.
- Ran `/api/credentials/health` locally to confirm encrypt/decrypt round-trip with the rotated defaults.

## Comms and rollback
- Scheduled deployment window: 2024-11-09 18:00–18:30 UTC.
- Rollback plan: restore `server/data` from object storage snapshot `mockdata-2024-11-05`, reapply secrets from vault item `Workspace API Secrets — 2024-10-28`, redeploy container tag `workspace-api:2024-11-02.1`.
- Notifications sent 2024-11-09 15:30 UTC:
  - `#support-announcements` — deployment window, dataset refresh summary, rollback contacts.
  - `#product-updates` — feature highlights, workflow version changes, rollback checklist.

## Follow-up
- After deploy, run smoke checklist `docs/qa-checklists.md#post-deploy`.
- Monitor audit log for `credential-secret-rotation` events to confirm production secrets applied.
