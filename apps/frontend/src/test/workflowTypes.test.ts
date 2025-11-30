import { describe, expect, it } from 'vitest';
import {
  WorkflowExecutionLog,
  WorkflowPort,
  WorkflowStep,
  cloneSteps,
  createEmptyStep,
} from '@/types/workflow';

describe('workflow type helpers', () => {
  it('creates a step with defaults and unique identifiers', () => {
    const first = createEmptyStep();
    const second = createEmptyStep();

    expect(first.id).toBeDefined();
    expect(second.id).toBeDefined();
    expect(first.id).not.toBe(second.id);
    expect(first.name).toBe('Untitled Step');
    expect(first.type).toBe('action');
    expect(first.position).toEqual({ x: 160, y: 160 });
    expect(first.config).toEqual({});
    expect(first.logs).toEqual([]);
  });

  it('respects partial overrides while cloning nested collections', () => {
    const inputs: WorkflowPort[] = [{ id: 'input-1', label: 'Input 1', dataType: 'text' }];
    const outputs: WorkflowPort[] = [{ id: 'output-1', label: 'Output 1', dataType: 'text' }];
    const logs: WorkflowExecutionLog[] = [
      { id: 'log-1', timestamp: '2024-01-01T00:00:00.000Z', status: 'running', message: 'Started' },
    ];

    const step = createEmptyStep({
      id: 'custom-step',
      name: 'Custom',
      type: 'trigger',
      position: { x: 20, y: 40 },
      config: { enabled: true },
      inputs,
      outputs,
      branches: [{ id: 'branch-1', label: 'Default', condition: 'true' }],
      logs,
    });

    expect(step.id).toBe('custom-step');
    expect(step.name).toBe('Custom');
    expect(step.type).toBe('trigger');
    expect(step.position).toEqual({ x: 20, y: 40 });
    expect(step.config).toEqual({ enabled: true });

    expect(step.inputs).not.toBe(inputs);
    expect(step.inputs[0]).not.toBe(inputs[0]);
    expect(step.outputs).not.toBe(outputs);
    expect(step.outputs[0]).not.toBe(outputs[0]);
    expect(step.logs).not.toBe(logs);
    expect(step.logs[0]).not.toBe(logs[0]);
  });

  it('clones steps deeply to avoid shared references', () => {
    const base = createEmptyStep({
      name: 'Shared',
      config: { retries: 1 },
      inputs: [{ id: 'in', label: 'In', dataType: 'text' }],
      outputs: [{ id: 'out', label: 'Out', dataType: 'text' }],
      branches: [{ id: 'branch', label: 'Branch', condition: 'x > 1' }],
      logs: [
        { id: 'log', timestamp: '2024-01-01T00:00:00.000Z', status: 'success', message: 'Done' },
      ],
    });

    const cloned = cloneSteps([base]);

    expect(cloned).toHaveLength(1);
    const [stepClone] = cloned;

    expect(stepClone).not.toBe(base);
    expect(stepClone.id).toBe(base.id);
    expect(stepClone.position).not.toBe(base.position);
    expect(stepClone.config).not.toBe(base.config);
    expect(stepClone.inputs).not.toBe(base.inputs);
    expect(stepClone.inputs[0]).not.toBe(base.inputs[0]);
    expect(stepClone.outputs).not.toBe(base.outputs);
    expect(stepClone.branches).not.toBe(base.branches);
    expect(stepClone.logs).not.toBe(base.logs);

    // Mutating the clone should not affect the original
    stepClone.position.x = 500;
    stepClone.config.retries = 4;
    stepClone.inputs[0].label = 'Modified';
    stepClone.logs[0].message = 'Changed';

    expect(base.position.x).not.toBe(500);
    expect(base.config.retries).toBe(1);
    expect(base.inputs[0].label).toBe('In');
    expect(base.logs[0].message).toBe('Done');
  });

  it('preserves and deep clones unknown properties when available', () => {
    const stepWithMetadata = {
      ...createEmptyStep({ name: 'With metadata' }),
      metadata: { tags: ['alpha'] },
    } as WorkflowStep & { metadata: { tags: string[] } };

    const [clone] = cloneSteps([stepWithMetadata]) as Array<WorkflowStep & { metadata: { tags: string[] } }>;

    expect(clone.metadata).toEqual(stepWithMetadata.metadata);
    expect(clone.metadata).not.toBe(stepWithMetadata.metadata);

    clone.metadata.tags.push('beta');
    expect(stepWithMetadata.metadata.tags).toEqual(['alpha']);
  });
});
