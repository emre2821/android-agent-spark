# Node Authoring Guide

This project treats **nodes** as the atomic steps that power an automation workflow. They show up inside the `WorkflowDialog` component and describe triggers, actions, and processors that an agent can chain together.

## Node schema
Each node uses a minimal interface:

```ts
interface WorkflowStep {
  id: string;
  type: 'trigger' | 'action' | 'analyze' | 'process' | 'condition' | string;
  name: string;
  config: Record<string, unknown>;
}
```

- `id`: a unique string (use `crypto.randomUUID()` or `Date.now().toString()` for mock data).
- `type`: drives iconography and grouping inside the dialog.
- `name`: short human readable description.
- `config`: free-form JSON for runtime execution.

## Adding prebuilt nodes
1. Open `src/components/WorkflowDialog.tsx` and locate the `prebuiltWorkflows` array.
2. Append a new workflow object with `steps` that match the schema above.
3. Provide an icon from `lucide-react` so the card has immediate visual identity.
4. Keep descriptions concise (≤120 characters) so they render cleanly within the card grid.

## Authoring custom nodes at runtime
Users can assemble bespoke workflows within the **Custom Workflow** tab of the dialog:

1. The dialog maintains a local `customWorkflow` object in component state.
2. Pressing “Add Step” appends a new node with default values; users can rename, select a type, and add config.
3. `removeCustomStep` prunes steps safely without mutating state in place.
4. Persisting the workflow happens inside `handleSaveCustom`—replace the `console.log` with your API call once the backend is ready.

## Execution contracts
When wiring nodes to a real runtime:
- Ensure the backend accepts the `WorkflowStep` structure (including the `config` payload) to avoid breaking authoring.
- Validate config on both client and server; use Zod schemas in `src/lib` to keep validation reusable.
- Emit toast notifications through `useToast()` to communicate success/failure back to the author.

## Testing new nodes
- Extend `cypress/fixtures/agents.json` or create workflow-specific fixtures if end-to-end coverage is needed.
- Add component tests around the dialog behaviours (e.g., adding/removing steps) to keep interaction patterns stable.
- Keep node logic pure and serialisable so Vitest can exercise it without mocking DOM APIs.

