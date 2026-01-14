import { describe, expect, it } from 'vitest';
import { createInMemoryWorkflowsManager } from '@/hooks/use-workflows';
import { createEmptyStep } from '@/types/workflow';

describe('workflow store', () => {
  it('creates workflows with default metadata', () => {
    const store = createInMemoryWorkflowsManager();

    const workflow = store.createWorkflow({
      name: 'Test Flow',
      description: 'Runs a simple automation',
    });

    const created = store.getWorkflows();
    expect(created).toHaveLength(1);
    expect(created[0].name).toBe('Test Flow');
    expect(created[0].status).toBe('draft');
    expect(workflow.versions).toHaveLength(0);
  });

  it('adds, updates, and runs workflow steps', () => {
    const initialStep = createEmptyStep({ name: 'Initial', type: 'trigger' });
    const store = createInMemoryWorkflowsManager();
    const workflow = store.createWorkflow({
      name: 'Interactive Flow',
      description: 'Exercises builder actions',
      steps: [initialStep],
    });

    const added = store.addStep(workflow.id, { name: 'Action Step' });
    expect(added.name).toBe('Action Step');

    store.updateStep(workflow.id, initialStep.id, { name: 'Updated Trigger' });

    let updated = store.getWorkflows()[0];
    expect(updated.steps[0].name).toBe('Updated Trigger');
    expect(updated.steps).toHaveLength(2);

    store.runWorkflow(workflow.id);

    updated = store.getWorkflows()[0];
    expect(updated.steps[0].logs.length).toBeGreaterThan(0);
    expect(updated.lastRunStatus).toBe('success');
    expect(updated.versions.length).toBeGreaterThan(0);
  });

  it('applies workflows to agents and records versions', () => {
    const store = createInMemoryWorkflowsManager();
    const workflow = store.createWorkflow({
      name: 'Agent Flow',
      description: 'Scoped to an agent',
    });

    store.applyWorkflowToAgent(workflow.id, 'agent-42');

    const [updated] = store.getWorkflows();
    expect(updated.agentId).toBe('agent-42');
    expect(updated.status).toBe('active');
    expect(updated.versions.length).toBeGreaterThan(0);
    expect(updated.versions[0].note).toContain('agent-42');
  });
});
