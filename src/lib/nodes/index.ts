import { z } from 'zod';

export type NodeCategory = 'http' | 'webhook' | 'database' | 'messaging';

export type LogLevel = 'info' | 'debug' | 'warn' | 'error';

export interface NodeExecutionLog {
  level: LogLevel;
  message: string;
  timestamp: string;
  stepId?: string;
  data?: Record<string, unknown> | null;
}

export interface CredentialAccessor {
  getCredential: (credentialId: string) => Promise<Record<string, unknown> | null>;
}

export interface NodeExecutionContext {
  userId: string;
  workspaceId: string;
  credentials: CredentialAccessor;
  emitLog: (entry: Omit<NodeExecutionLog, 'timestamp'> & { timestamp?: string }) => void;
  fetchImpl?: typeof fetch;
}

export interface NodeExecutionResult<Output = unknown> {
  status: 'success' | 'error';
  output?: Output;
}

export interface NodeDefinition<ConfigSchema extends z.ZodTypeAny, Output = unknown> {
  type: string;
  displayName: string;
  description: string;
  category: NodeCategory;
  configSchema: ConfigSchema;
  run: (options: {
    config: z.infer<ConfigSchema>;
    context: NodeExecutionContext;
  }) => Promise<NodeExecutionResult<Output>>;
}

const registry = new Map<string, NodeDefinition<z.ZodTypeAny, unknown>>();

export const registerNode = <Schema extends z.ZodTypeAny, Output = unknown>(
  node: NodeDefinition<Schema, Output>,
) => {
  registry.set(node.type, node as NodeDefinition<z.ZodTypeAny, Output>);
};

export const getNode = (type: string) => registry.get(type);

export const listNodes = () => Array.from(registry.values());

const defaultFetchImpl: typeof fetch = (...args) => fetch(...args);

const createStepLogger = (
  context: NodeExecutionContext,
): NodeExecutionContext => {
  const emitLog = context.emitLog ?? (() => undefined);
  return {
    ...context,
    emitLog: (entry) => {
      emitLog({
        level: entry.level,
        message: entry.message,
        stepId: entry.stepId,
        data: entry.data,
        timestamp: entry.timestamp ?? new Date().toISOString(),
      });
    },
    fetchImpl: context.fetchImpl ?? defaultFetchImpl,
  };
};

const httpNodeConfig = z.object({
  url: z.string().url({ message: 'A valid URL is required' }),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.union([z.string(), z.record(z.any())]).optional(),
  credentialId: z.string().optional(),
});

registerNode({
  type: 'http.request',
  displayName: 'HTTP Request',
  description: 'Perform an HTTP request with optional headers and payload',
  category: 'http',
  configSchema: httpNodeConfig,
  async run({ config, context }) {
    const stepContext = createStepLogger(context);
    stepContext.emitLog({ level: 'info', message: `Preparing HTTP ${config.method} request`, data: { url: config.url } });

    let resolvedBody: BodyInit | undefined;
    if (typeof config.body === 'string') {
      resolvedBody = config.body;
    } else if (config.body) {
      resolvedBody = JSON.stringify(config.body);
    }

    const credentialHeaders: Record<string, string> = {};
    if (config.credentialId) {
      const secret = await stepContext.credentials.getCredential(config.credentialId);
      if (!secret) {
        stepContext.emitLog({ level: 'warn', message: 'Credential not found for HTTP request', data: { credentialId: config.credentialId } });
      } else if (typeof secret.token === 'string') {
        credentialHeaders['Authorization'] = `Bearer ${secret.token}`;
      }
    }

    const fetchImpl = stepContext.fetchImpl ?? defaultFetchImpl;

    const headers = new Headers();
    if (typeof resolvedBody === 'string') {
      headers.set('Content-Type', 'application/json');
    }
    Object.entries({ ...credentialHeaders, ...(config.headers ?? {}) }).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        headers.set(key, value);
      }
    });

    const response = await fetchImpl(config.url, {
      method: config.method,
      headers,
      body: resolvedBody,
    });

    const contentType = response.headers.get('content-type') ?? '';
    let payload: unknown;
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    stepContext.emitLog({
      level: 'info',
      message: `HTTP request completed with status ${response.status}`,
      data: { status: response.status },
    });

    return {
      status: response.ok ? 'success' : 'error',
      output: {
        status: response.status,
        ok: response.ok,
        payload,
      },
    };
  },
});

const webhookNodeConfig = z.object({
  eventName: z.string().min(1, 'Event name is required'),
  payloadExample: z.record(z.any()).optional(),
  responseTemplate: z.string().optional(),
});

registerNode({
  type: 'webhook.listen',
  displayName: 'Webhook Listener',
  description: 'Define a webhook entry point and response template',
  category: 'webhook',
  configSchema: webhookNodeConfig,
  async run({ config, context }) {
    const stepContext = createStepLogger(context);
    stepContext.emitLog({
      level: 'info',
      message: `Webhook listener armed for event "${config.eventName}"`,
    });

    return {
      status: 'success',
      output: {
        expectedPayload: config.payloadExample ?? null,
        response: config.responseTemplate ?? 'OK',
      },
    };
  },
});

const databaseNodeConfig = z.object({
  dialect: z.enum(['postgres', 'mysql', 'sqlite', 'mssql']),
  statement: z.string().min(1, 'A SQL statement is required'),
  parameters: z.array(z.any()).optional(),
  credentialId: z.string().min(1, 'Database credential is required'),
});

registerNode({
  type: 'database.query',
  displayName: 'Database Query',
  description: 'Execute a SQL query using a stored credential',
  category: 'database',
  configSchema: databaseNodeConfig,
  async run({ config, context }) {
    const stepContext = createStepLogger(context);
    const credential = await stepContext.credentials.getCredential(config.credentialId);
    if (!credential) {
      stepContext.emitLog({ level: 'error', message: 'Missing database credential', data: { credentialId: config.credentialId } });
      return { status: 'error' };
    }

    stepContext.emitLog({
      level: 'info',
      message: `Simulating ${config.dialect} query execution`,
      data: { statement: config.statement },
    });

    return {
      status: 'success',
      output: {
        rows: Array.isArray(credential.sampleRows) ? credential.sampleRows : [],
        metadata: {
          dialect: config.dialect,
          parameters: config.parameters ?? [],
        },
      },
    };
  },
});

const messagingNodeConfig = z.object({
  channel: z.string().min(1, 'Channel is required'),
  message: z.string().min(1, 'Message is required'),
  credentialId: z.string().optional(),
  urgent: z.boolean().default(false),
});

registerNode({
  type: 'messaging.send',
  displayName: 'Messaging Dispatch',
  description: 'Send a message to a channel or contact',
  category: 'messaging',
  configSchema: messagingNodeConfig,
  async run({ config, context }) {
    const stepContext = createStepLogger(context);
    let provider: string | undefined;

    if (config.credentialId) {
      const credential = await stepContext.credentials.getCredential(config.credentialId);
      provider = typeof credential?.provider === 'string' ? credential.provider : undefined;
      if (!credential) {
        stepContext.emitLog({ level: 'warn', message: 'Credential not found for messaging node', data: { credentialId: config.credentialId } });
      }
    }

    stepContext.emitLog({
      level: 'info',
      message: `Dispatching message to ${config.channel}`,
      data: { urgent: config.urgent, provider },
    });

    return {
      status: 'success',
      output: {
        channel: config.channel,
        urgent: config.urgent,
        provider: provider ?? 'generic',
      },
    };
  },
});

export const nodeRegistry = {
  getNode,
  listNodes,
};

