import { getNode, NodeExecutionContext, NodeExecutionLog, NodeExecutionResult } from './nodes';

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  nodeType: string;
  config: unknown;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStepDefinition[];
}

export interface WorkflowRunResult {
  status: 'completed' | 'failed';
  outputs: Record<string, NodeExecutionResult>;
}

export type WorkflowLogListener = (entry: NodeExecutionLog & { stepId: string }) => void;

export interface WorkflowExecutionContext extends Omit<NodeExecutionContext, 'emitLog'> {
  emitLog?: NodeExecutionContext['emitLog'];
}

export class WorkflowEngine {
  async run(
    definition: WorkflowDefinition,
    context: WorkflowExecutionContext,
    onLog: WorkflowLogListener,
  ): Promise<WorkflowRunResult> {
    const outputs: Record<string, NodeExecutionResult> = {};
    for (const step of definition.steps) {
      const node = getNode(step.nodeType);
      if (!node) {
        const message = `Node handler not found for type "${step.nodeType}"`;
        onLog({
          level: 'error',
          message,
          stepId: step.id,
          timestamp: new Date().toISOString(),
        });
        throw new Error(message);
      }

      const emitLog = (entry: Omit<NodeExecutionLog, 'timestamp'> & { timestamp?: string }) => {
        onLog({
          ...entry,
          stepId: step.id,
          timestamp: entry.timestamp ?? new Date().toISOString(),
        });
      };

      emitLog({
        level: 'info',
        message: `Starting step "${step.name}" using ${node.displayName}`,
      });

      const validatedConfig = node.configSchema.parse(step.config);
      try {
        const result = await node.run({
          config: validatedConfig,
          context: {
            ...context,
            emitLog,
          },
        });
        outputs[step.id] = result;
        emitLog({
          level: result.status === 'success' ? 'info' : 'warn',
          message: `Completed with status ${result.status}`,
        });
        if (result.status === 'error') {
          return {
            status: 'failed',
            outputs,
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        emitLog({ level: 'error', message });
        throw error;
      }
    }

    return {
      status: 'completed',
      outputs,
    };
  }
}

export const workflowEngine = new WorkflowEngine();

