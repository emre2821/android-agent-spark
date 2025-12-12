# Node Authoring Guide

Workflow automation now runs through a formal node registry and execution engine. Each node describes the work it can perform, how it should be configured, and how it reports progress back to the UI.

## Node definition basics

Nodes live in `src/lib/nodes/index.ts` and are registered with `registerNode`. A node definition includes:

- A globally unique `type` string (e.g. `http.request`).
- Metadata (`displayName`, `description`, `category`) so the builder can render cards and icons.
- A Zod `configSchema` that validates user-supplied configuration before execution.
- An async `run` handler that receives the validated config and a `NodeExecutionContext` with helpers for logging, credential access, and outbound HTTP calls.【F:src/lib/nodes/index.ts†L1-L200】

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

## Configuration & validation

- Keep schemas strict—use enums, `min`/`max`, and `refine` helpers so invalid payloads never reach downstream services.
- Optional fields should default inside the schema (e.g. `z.enum([...]).default('GET')`) so the UI and engine stay in sync.【F:src/lib/nodes/index.ts†L60-L120】
- Fail validation early and surface descriptive error messages; the workflow builder surfaces these to authors.

## Execution context

`NodeExecutionContext` carries runtime metadata and helpers:

- `userId` / `workspaceId` scope the execution.
- `credentials.getCredential(id)` resolves stored secrets before making outbound calls.
- `emitLog(entry)` streams structured logs that appear in the workflow run console.
- `fetchImpl` falls back to `globalThis.fetch`, but can be replaced in tests for determinism.【F:src/lib/nodes/index.ts†L12-L80】

Always log meaningful milestones (`info`), warnings (`warn`), and errors (`error`). Long-running handlers should emit periodic updates so operators see progress.

## Workflow engine integration

- `WorkflowsProvider` clones node definitions when building drafts so mutations never mutate registry state. Use helper utilities such as `createEmptyStep` and `cloneSteps` from `src/types/workflow` to keep snapshots consistent.【F:src/hooks/use-workflows.tsx†L1-L120】
- When a workflow runs, execution logs are appended via `logStepExecution`, which relies on node handlers emitting log entries. Returning `{ status: 'error' }` marks the step as failed without crashing the entire run.【F:src/hooks/use-workflows.tsx†L80-L200】

## Credentials & secrets

Do not embed raw credentials directly in node configuration. Accept a `credentialId` and fetch the decrypted payload via the execution context. Many built-in nodes already demonstrate this pattern (e.g. `database.query` and `http.request`). Missing credentials should emit a warning and return `{ status: 'error' }` to halt safely.【F:src/lib/nodes/index.ts†L80-L200】

## Testing nodes

- Use Vitest to exercise nodes in isolation—pass a mocked `NodeExecutionContext` with stubbed `emitLog`/`credentials` to assert behaviour.
- End-to-end workflow tests should focus on integration paths (credential lookup + log emission) rather than duplicating unit coverage. See `src/hooks/__tests__/use-agents.test.tsx` and workflow engine tests for patterns that mock WebSocket streams and execution logs.【F:src/hooks/__tests__/use-agents.test.tsx†L1-L240】

## Surfacing new nodes in the UI

- Registering a node automatically exposes it in the workflow builder palette. Provide friendly metadata so the UI can group it under the appropriate category card.
- For bespoke starter workflows, extend the presets under `src/lib/workflowTemplates.ts` so authors see curated examples that leverage the new node types.【F:src/lib/workflowTemplates.ts†L1-L200】

