import { describe, expect, it, vi } from 'vitest';
import { nodeRegistry } from '@/lib/nodes';
import { WorkflowEngine } from '@/lib/workflowEngine';

const engine = new WorkflowEngine();

describe('node registry', () => {
  it('contains the seeded messaging node', () => {
    const messagingNode = nodeRegistry.listNodes().find((node) => node.type === 'messaging.send');
    expect(messagingNode).toBeDefined();
    expect(messagingNode?.category).toBe('messaging');
  });
});

describe('messaging node execution', () => {
  it('streams logs and completes successfully', async () => {
    const logs: any[] = [];

    const result = await engine.run(
      {
        id: 'test-workflow',
        name: 'Messaging Workflow',
        steps: [
          {
            id: 'message-step',
            name: 'Send Message',
            nodeType: 'messaging.send',
            config: {
              channel: 'alerts',
              message: 'Test message',
              urgent: true,
            },
          },
        ],
      },
      {
        userId: 'tester',
        workspaceId: 'unit-tests',
        credentials: {
          getCredential: vi.fn().mockResolvedValue({ provider: 'slack' }),
        },
      },
      (entry) => logs.push(entry),
    );

    expect(result.status).toBe('completed');
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((entry) => entry.message.includes('Dispatching message'))).toBe(true);
  });

  it('fails validation when configuration is missing', async () => {
    await expect(
      engine.run(
        {
          id: 'invalid-workflow',
          name: 'Invalid Messaging',
          steps: [
            {
              id: 'bad-step',
              name: 'Bad Step',
              nodeType: 'messaging.send',
              config: {
                message: 'Missing channel',
              },
            },
          ],
        },
        {
          userId: 'tester',
          workspaceId: 'unit-tests',
          credentials: {
            getCredential: vi.fn(),
          },
        },
        () => undefined,
      ),
    ).rejects.toThrowError();
  });
});

