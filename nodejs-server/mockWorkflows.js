export const mockWorkflows = [
  {
    id: 'wf-email-001',
    name: 'Email Response Automation',
    description: 'Route inbound requests and automatically generate replies.',
    status: 'draft',
    version: 1,
    triggerId: 'wf-email-001-node-1',
    nodes: [
      {
        id: 'wf-email-001-node-1',
        type: 'trigger',
        label: 'Email Received',
        position: { x: 0, y: 0 },
        data: {
          summary: 'Watch a shared inbox for new messages.',
          inputs: [],
          outputs: [
            {
              id: 'out-1',
              label: 'Email payload',
              type: 'output',
              dataType: 'email',
            },
          ],
          config: { folder: 'inbox' },
        },
      },
      {
        id: 'wf-email-001-node-2',
        type: 'analyze',
        label: 'Analyze Content',
        position: { x: 0, y: 150 },
        data: {
          summary: 'Extract the topic and tone of each message.',
          inputs: [],
          outputs: [],
          config: { sentiment: true },
        },
      },
      {
        id: 'wf-email-001-node-3',
        type: 'action',
        label: 'Generate Response',
        position: { x: 0, y: 300 },
        data: {
          summary: 'Draft a response with the appropriate template.',
          inputs: [],
          outputs: [],
          config: { template: 'professional' },
        },
      },
    ],
    edges: [
      {
        id: 'wf-email-001-edge-1',
        source: 'wf-email-001-node-1',
        target: 'wf-email-001-node-2',
      },
      {
        id: 'wf-email-001-edge-2',
        source: 'wf-email-001-node-2',
        target: 'wf-email-001-node-3',
      },
    ],
    inputs: [
      { id: 'wf-email-input-folder', key: 'folder', label: 'Folder', type: 'string' },
    ],
    outputs: [
      { id: 'wf-email-output-id', key: 'responseId', label: 'Response Id', type: 'string' },
    ],
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-10T09:15:00.000Z',
    execution: {
      runCount: 27,
      lastRunAt: '2024-01-10T08:45:00.000Z',
      nextRunAt: '2024-01-10T09:45:00.000Z',
      schedule: '*/60 * * * *',
      lastRunStatus: 'success',
    },
    metadata: {
      tags: ['communication', 'email'],
      owner: 'automation-team',
      category: 'Communication',
    },
  },
  {
    id: 'wf-content-002',
    name: 'Content Generation Pipeline',
    description: 'Produce and publish campaign content.',
    status: 'published',
    version: 3,
    triggerId: 'wf-content-002-node-1',
    nodes: [
      {
        id: 'wf-content-002-node-1',
        type: 'trigger',
        label: 'Content Request',
        position: { x: 120, y: 0 },
        data: {
          summary: 'Start when a new brief is submitted.',
          inputs: [],
          outputs: [],
          config: { source: 'form' },
        },
      },
      {
        id: 'wf-content-002-node-2',
        type: 'action',
        label: 'Research Topic',
        position: { x: 120, y: 150 },
        data: {
          summary: 'Gather references and supporting data.',
          inputs: [],
          outputs: [],
          config: { sources: 3 },
        },
      },
      {
        id: 'wf-content-002-node-3',
        type: 'generate',
        label: 'Create Content',
        position: { x: 120, y: 300 },
        data: {
          summary: 'Produce the initial draft.',
          inputs: [],
          outputs: [],
          config: { tone: 'brand' },
        },
      },
      {
        id: 'wf-content-002-node-4',
        type: 'action',
        label: 'Publish Content',
        position: { x: 120, y: 450 },
        data: {
          summary: 'Distribute to configured channels.',
          inputs: [],
          outputs: [],
          config: { platforms: ['blog', 'social'] },
        },
      },
    ],
    edges: [
      {
        id: 'wf-content-002-edge-1',
        source: 'wf-content-002-node-1',
        target: 'wf-content-002-node-2',
      },
      {
        id: 'wf-content-002-edge-2',
        source: 'wf-content-002-node-2',
        target: 'wf-content-002-node-3',
      },
      {
        id: 'wf-content-002-edge-3',
        source: 'wf-content-002-node-3',
        target: 'wf-content-002-node-4',
      },
    ],
    inputs: [
      { id: 'wf-content-input-topic', key: 'topic', label: 'Topic', type: 'string', required: true },
    ],
    outputs: [
      { id: 'wf-content-output-url', key: 'url', label: 'Published URL', type: 'string' },
    ],
    createdAt: '2024-01-03T09:00:00.000Z',
    updatedAt: '2024-01-11T11:30:00.000Z',
    execution: {
      runCount: 12,
      lastRunAt: '2024-01-11T09:00:00.000Z',
      nextRunAt: '2024-01-18T09:00:00.000Z',
      schedule: '0 9 * * 1',
      lastRunStatus: 'running',
    },
    metadata: {
      tags: ['marketing'],
      owner: 'growth',
      category: 'Content',
    },
  },
];
