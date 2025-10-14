# Troubleshooting

## Dev server will not connect to the API
- Ensure `npm run server` is running on port 3001.
- If another process already uses the port, export `PORT=3002` before starting the server and update the client fetch URL temporarily.
- When working behind a corporate proxy, add the host to your allow list because Vite defaults to IPv6 (`::`). Use `npm run dev -- --host 127.0.0.1` if IPv6 routing fails.

## Vitest or coverage failures
- Delete the `.vitest` cache (`rm -rf node_modules/.vitest`) when snapshots or coverage get stuck.
- Make sure your new components export deterministic output—avoid time-based IDs or random values without seeding.
- Coverage thresholds are enforced; run `npm test -- --runInBand` locally if you suspect race conditions.

## Cypress cannot launch browsers in CI
- Cypress ships with the Electron binary, but Linux environments sometimes miss system libraries. Install `libgtk-3-0` and `libnss3` on your runner if the error mentions them.
- Use `npx cypress verify` to confirm the binary is properly unpacked before running `npm run test:e2e`.
- When the preview server fails to start, check for lingering ports and re-run `npm run preview -- --clearScreen false` for more verbose output.

## Express server crashes on start
- Syntax errors often stem from using ES module syntax without enabling "type": "module"—this repo already sets it in `package.json`. If you add new files under `server/`, keep the `.js` extension and use `import`/`export` exclusively.
- Wrap asynchronous route handlers in `try/catch` to surface runtime errors cleanly instead of leaving the process hanging.

## UI regressions after dependency upgrades
- Re-run `npm install` to refresh the lockfile and ensure you are not on a partially upgraded state.
- Check the shadcn/ui changelog; breaking class name changes often manifest as missing animations or spacing issues.
- Add targeted component tests before bumping major versions so Vitest can highlight regressions during the upgrade.

