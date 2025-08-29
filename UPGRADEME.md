# Upgrade Me

A living wish list for where the agent dashboard could evolve next.

## Feature Ideas
- **Real API integration**: Replace mock agents with persistent backend services and WebSocket updates for real-time stats.
- **Workflow editor**: Promote the workflow dialog into a full page with draggable steps and version history.
- **Mobile-first polish**: Finish Capacitor packaging and refine layouts for small screens.

## Code Quality
- **Type safety sweep**: Enable strict TypeScript settings and add missing types for dialogs and hooks.
- **Test harness**: Introduce Vitest + React Testing Library and aim for coverage on agent creation and memory flows.
- **Lint cleanup**: Resolve existing ESLint warnings and enforce formatting with Prettier.

## Integrations
- **Auth provider**: Wire in OAuth or session tokens to secure agent operations.
- **Data export/import**: Support JSON or CSV exports of agent configs and memory, with matching import paths.
- **Plugin system**: Define a plugin interface so third parties can inject new agent skills.

## Developer Experience
- **Storybook**: Document UI primitives and agent dialogs for rapid prototyping.
- **CI pipeline**: Add GitHub Actions for lint, test, and build to guard regressions.
- **Issue templates**: Provide GitHub templates for bugs, features, and questions to guide contributors.

