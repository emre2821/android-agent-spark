# 2024-05-18 Mock Data Alignment and Credential Rotation

## Summary
- Refreshed the local mock dataset under `server/data` to mirror current production schema while maintaining anonymized identifiers.
- Rotated fallback JWT and credential encryption secrets used by the local development server.
- Prepared communication for support and product teams covering the deployment timeline and rollback steps.

## Mock Data Refresh
- Added coverage for the Lumen workspace and ensured every record references masked identifiers only.
- Updated task and memory logs to reflect the v3 masking policy (no raw URLs, tokens, or channel names remain).
- Timestamp windows align with the planned release window (2024-05-18) for realistic regression scenarios.
- Validation checklist:
  - [x] `workspaceId` references map to defined workspaces in `server/data.js`.
  - [x] Owner email addresses remain inside the `example.com` domain.
  - [x] Logs reference masking, surrogate IDs, or tokenized assets explicitly.

## Secret Rotation
- New fallback secrets for local/dev usage:
  - `JWT_SECRET`: `dev-secret-20240518`
  - `CREDENTIALS_SECRET`: `development-secret-key-20240518`
- Production/staging operators must set real secrets via environment variables prior to deploy:
  - `export JWT_SECRET="<new-random-64-char-string>"`
  - `export CREDENTIALS_SECRET="<new-random-32-byte-hex>"`
- Credential rotation steps:
  1. Generate secrets and store them in the shared secret manager under `agent-platform/dev/2024-05-18`.
  2. Update CI/CD variable store and restart worker pods sequentially (allow 5 minutes between restarts).
  3. Verify credential store decrypt/encrypt cycle via `/api/credentials/health` endpoint.

## Support & Product Notifications
- **Target send:** 2024-05-18 15:00 UTC (two hours before deployment window).
- **Channels:**
  - `#support-announcements`
  - `#product-updates`
- **Message draft:**
  > Heads up team — we’re deploying the agent workspace data refresh at 17:00 UTC. Mock datasets now mirror production schema with updated masking, and auth secrets have been rotated. Expect a 5-minute API restart. Rollback returns us to the 2024-05-12 dataset snapshot and prior secrets.
- **Rollback plan:**
  1. Restore `server/data` from the `mock-dataset-backups/2024-05-12` snapshot in object storage.
  2. Re-apply previous secrets from secret manager path `agent-platform/dev/2024-05-12`.
  3. Redeploy the previous container image tag (`workspace-api:2024-05-12.1`).
  4. Announce rollback completion in the same support/product channels.

## Follow-up
- After deployment, run the smoke checklist in `docs/qa-checklists.md#post-deploy`.
- Confirm credential rotation success by checking audit log entries for `credential-secret-rotation` events.
