# Contributing to Android Agent Spark

Thank you for helping improve Android Agent Spark! Your contributions help make this project better for everyone. Please follow these guidelines to keep the project healthy and shippable.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/android-agent-spark.git`
3. Install dependencies: `npm run install:all` or `make install`
4. Copy environment config: `cp .env.example .env`
5. Start development: `npm run dev` or `make dev`

## Branching and Workflow

- Create feature branches from `develop`
- Open pull requests targeting `develop`
- Maintainers will fast-forward or merge to `main` for releases
- Keep PRs focused and small
- Include screenshots or logs for UI changes or failing tests you fixed

## Code Style

- Use TypeScript/JavaScript ES modules with clear, descriptive names
- Prefer functional, composable React components
- Avoid try/catch around imports and keep error handling near the call site
- Run formatters/linters before pushing (see scripts below)

## Testing and Verification

- Add or update unit tests alongside code changes
- For UI flows, add a minimal e2e or integration test when feasible
- Ensure Docker-based demo still runs when touching build or env variables

## Local Development Scripts

Run commands from the repository root unless noted. You can use either npm or Make:

| Task | npm command | Make command |
|------|-------------|--------------|
| Install deps | `npm run install:all` | `make install` |
| Lint | `npm run lint` | `make lint` |
| Unit tests | `npm test` | `make test` |
| Build | `npm run build` | `make build` |
| Dev (web + server) | `npm run dev` | `make dev` |
| Web dev server | `npm run dev:web` | `make dev-web` |
| API dev server | `npm run dev:server` | `make dev-server` |
| Docker demo | `docker-compose up` | `make docker-up` |

Run `make help` for a complete list of available commands.

## Pull Request Checklist

- [ ] Rebased on latest `develop`
- [ ] Lint, test, and build scripts pass locally
- [ ] Added docs or comments for new behavior
- [ ] Included relevant screenshots or artifacts for UI changes
- [ ] Updated `.env.example` if configuration changed

## Questions?

If you have questions or need help, feel free to open an issue or start a discussion. We're happy to help!
