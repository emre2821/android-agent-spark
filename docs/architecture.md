# Architecture Overview

## System map
- **Client:** React 18 + Vite with the shadcn/ui component primitives. Routing is handled by `react-router-dom`, data fetching and caching by `@tanstack/react-query`, and shared context lives under `src/hooks`.
- **Server:** A lightweight Express service under `server/` that exposes mock agent data via `/agents`. It is designed to be replaced with a production orchestrator while keeping the contract intact.
- **Build tooling:** Vite powers development and static builds, TailwindCSS drives styling, and Vitest provides the testing runtime. Capacitor sits on top of Vite bundles for mobile/desktop packaging.

## Runtime flow
1. The application boots inside `src/main.tsx`, renders `<App />`, and wires the `QueryClientProvider`, `AgentsProvider`, and router.
2. `AgentsProvider` executes `fetch('http://localhost:3001/agents')` via React Query. Once the promise resolves, agent state is propagated to the dashboard.
3. Components under `src/components` consume `useAgents()` and `useToast()` to mutate local state (e.g., creating agents, updating config) and surface feedback.
4. Navigation flows through `src/pages`, which are thin wrappers around dashboard/detail components. Deep links (`/agents/:id`) reuse the cached agent collection.
5. The Express backend reads from `mockAgents.js` and returns JSON responses. The `createApp()` factory makes it testable while keeping the CLI entry point (`npm run server`) identical.

## State & data
- **Agents:** Stored in context provided by `AgentsProvider`. Components mutate the array via `setAgents`, ensuring React Query cache stays the single source of truth.
- **Workflows & dialogs:** Managed through local component state, allowing multiple overlays to coexist without global stores.
- **Toasts:** The custom hook in `src/hooks/use-toast.ts` centralises toast lifecycle handling so UI surfaces stay consistent.

## UI composition
- Layout primitives reside in `src/components/ui`, mirroring the shadcn/ui pattern. Higher-level composites (cards, dialogs, dashboards) are colocated with their logic for discoverability.
- Icons are provided via `lucide-react`. Visual theming comes from Tailwind utilities declared in `App.css` and `index.css`.

## Testing layers
- **Component & hook tests:** Vitest + Testing Library live next to the component files. They assert rendering, interactions, and side-effects such as toast emission.
- **Integration tests:** Vitest + Supertest validate the Express API contract, ensuring UI mocks stay in sync with backend responses.
- **End-to-end tests:** Cypress scripts under `cypress/e2e` exercise real user flows against a built preview, with network intercepts for determinism.
- **Coverage enforcement:** `vite.config.ts` enforces minimum coverage (90% lines/statements, 60% branches/functions) so regressions fail CI early.

## Extensibility points
- Replace the mock Express server with real orchestration while maintaining `/agents` shape.
- Add new dialogs, cards, or workflows by colocating them inside `src/components` and leveraging the existing UI primitives.
- Extend the Agents context with optimistic updates or background refresh using React Query's `queryClient.setQueryData` utilities.

