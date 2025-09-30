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

