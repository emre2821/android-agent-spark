# Contributing Guidelines

Thank you for helping Android Agent Spark grow. Follow these expectations so every contribution is easy to review and safe to merge.

## Development workflow
1. Fork the repository (or create a feature branch if you have push access).
2. Run through the quickstart steps in the README to make sure dev + mock API servers run locally.
3. Keep pull requests scoped—prefer many small PRs over a single monolith.

## Coding standards
- Use TypeScript for application logic; co-locate component tests beside the component.
- Reuse UI primitives from `src/components/ui` instead of duplicating styles.
- Avoid introducing new state managers; extend `useAgents` or React Query where possible.
- Do not wrap imports in `try/catch` (per repository convention).

## Quality checks
Run the full suite before asking for review:
```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
```
If any command fails, fix the regression and re-run.

## Commit & PR hygiene
- Use conventional commit messages when possible (e.g., `feat: add timeline widget`).
- Include screenshots or recordings for notable UI changes.
- Reference relevant issues and describe testing performed in the PR body.
- Keep documentation current—update files under `docs/` if your change alters behaviour.

## Code of conduct
- Be respectful and collaborative.
- Prefer async feedback (comments, suggestions) over force-pushes.
- Honour Eden’s ethics: protect autonomy, honor memory, and never misrepresent prior work.

