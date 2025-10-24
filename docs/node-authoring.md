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
# Node Authoring Guidelines

This guide explains how to create workflow nodes that integrate with the node registry and execution engine.

## Node definition basics

Nodes live in `src/lib/nodes/index.ts` and are described by a `NodeDefinition`. Each node provides:

- A globally unique `type` identifier (e.g. `http.request`).
- Metadata (`displayName`, `description`, `category`).
- A Zod `configSchema` describing configuration the node accepts.
- An async `run` handler that receives validated config and a `NodeExecutionContext`.

```ts
registerNode({
  type: 'example.node',
  displayName: 'Example Node',
  description: 'Explain what this node does.',
  category: 'messaging',
  configSchema: z.object({
    message: z.string(),
  }),
  async run({ config, context }) {
    context.emitLog({ level: 'info', message: `Sending: ${config.message}` });
    return { status: 'success' };
  },
});
```

## Configuration validation

All node configuration must be validated with Zod before execution. Keep schemas strict—prefer explicit enums and `min`/`max` checks to guarantee downstream safety. Optional values should use `optional()` so defaulting happens in the handler.

## Execution context

Handlers receive a `NodeExecutionContext` that provides:

- `userId` and `workspaceId` for scoping.
- `credentials.getCredential(id)` to fetch decrypted secrets.
- `emitLog(entry)` to stream structured logs back to the UI.
- `fetchImpl` (defaulting to `globalThis.fetch`) for HTTP-capable nodes.

Always call `emitLog` for meaningful state changes. Logs drive the workflow console and should be human-readable. Long-running nodes should periodically emit progress updates.

## Credential usage

Never place raw secrets in configuration. Instead, accept a `credentialId` and use `context.credentials.getCredential`. The helper returns decrypted payloads loaded from secure storage. When a credential is missing or malformed, emit a `warn`/`error` log and return `{ status: 'error' }` so the workflow engine halts gracefully.

## Error handling

Throwing inside `run` will bubble to the workflow engine and be surfaced as an execution error. Prefer returning `{ status: 'error' }` when the node can handle the issue (e.g. validation failure). Reserve thrown errors for unexpected problems.

## Testing nodes

Use Vitest to ensure nodes validate config and emit expected logs. See `src/test/sampleNode.test.ts` for an example that executes the `messaging.send` node through the workflow engine, asserts streamed logs, and verifies schema enforcement.

