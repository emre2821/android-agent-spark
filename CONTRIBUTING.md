# Contributing to Android Agent Spark

Thank you for helping improve Android Agent Spark. Please follow these guidelines to keep the project healthy and shippable.

## Branching and workflow
- Fork the repo and create feature branches from `develop`.
- Open pull requests targeting `develop`. Maintainers will fast-forward or merge to `main` for releases.
- Keep PRs focused and small; include screenshots or logs for UI changes or failing tests you fixed.

## Code style
- Use TypeScript/JavaScript ES modules with clear, descriptive names.
- Prefer functional, composable React components.
- Avoid try/catch around imports and keep error handling near the call site.
- Run formatters/linters before pushing (see scripts below).

## Testing and verification
- Add or update unit tests alongside code changes.
- For UI flows, add a minimal e2e or integration test when feasible.
- Ensure Docker-based demo still runs when touching build or env variables.

## Local development scripts
Run commands from the repository root unless noted:
- Lint: `npm run lint`
- Unit tests: `npm test`
- Build (web + server): `npm run build`
- Web dev server: `npm run dev:web`
- API dev server: `npm run dev:server`
- Combined dev (web + server): `npm run dev`

## Pull request checklist
- [ ] Rebased on latest `develop`.
- [ ] Lint, test, and build scripts pass locally.
- [ ] Added docs or comments for new behavior.
- [ ] Included relevant screenshots or artifacts for UI changes.
- [ ] Updated `.env.example` if configuration changed.
