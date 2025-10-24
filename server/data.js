import bcrypt from 'bcryptjs';

const hash = (password) => bcrypt.hashSync(password, 10);

export const workspaces = [
  {
    id: 'workspace-aurora',
    name: 'Aurora Research Lab',
    slug: 'aurora',
    description: 'Exploratory agents focused on reasoning and planning.',
  },
  {
    id: 'workspace-cobalt',
    name: 'Cobalt Ops',
    slug: 'cobalt',
    description: 'Operational automations for customer support.',
  },
  {
    id: 'workspace-lumen',
    name: 'Lumen Creative',
    slug: 'lumen',
    description: 'Creative experiments and narrative-driven agents.',
  },
];

export const users = [
  {
    id: 'user-avery',
    name: 'Avery Quinn',
    email: 'avery.owner@example.com',
    passwordHash: hash('password123'),
    workspaces: [
      { id: 'workspace-aurora', role: 'owner' },
      { id: 'workspace-lumen', role: 'admin' },
    ],
  },
  {
    id: 'user-bailey',
    name: 'Bailey Hart',
    email: 'bailey.admin@example.com',
    passwordHash: hash('password123'),
    workspaces: [
      { id: 'workspace-cobalt', role: 'admin' },
    ],
  },
  {
    id: 'user-casey',
    name: 'Casey Rivers',
    email: 'casey.editor@example.com',
    passwordHash: hash('password123'),
    workspaces: [
      { id: 'workspace-aurora', role: 'editor' },
    ],
  },
  {
    id: 'user-devon',
    name: 'Devon Lee',
    email: 'devon.viewer@example.com',
    passwordHash: hash('password123'),
    workspaces: [
      { id: 'workspace-cobalt', role: 'viewer' },
    ],
  },
];

export const workspaceResources = {
  'workspace-aurora': {
    agents: [
      {
        id: 'aurora-agent-1',
        workspaceId: 'workspace-aurora',
        name: 'Task Automator',
        description: 'Automates daily tasks and workflows with intelligent decision making',
        status: 'active',
        tasksCompleted: 147,
        memoryItems: 23,
        lastActive: '2 minutes ago',
      },
      {
        id: 'aurora-agent-2',
        workspaceId: 'workspace-aurora',
        name: 'Data Collector',
        description: 'Gathers and organizes information from multiple sources',
        status: 'learning',
        tasksCompleted: 89,
        memoryItems: 156,
        lastActive: '1 hour ago',
      },
      {
        id: 'aurora-agent-3',
        workspaceId: 'workspace-aurora',
        name: 'Smart Assistant',
        description: 'Provides intelligent responses and performs complex reasoning',
        status: 'inactive',
        tasksCompleted: 342,
        memoryItems: 89,
        lastActive: '3 days ago',
      },
    ],
    workflows: [
      { id: 'aurora-workflow-1', name: 'Daily Research Digest', status: 'active' },
      { id: 'aurora-workflow-2', name: 'Insight Synthesizer', status: 'paused' },
    ],
    credentials: [
      { id: 'aurora-cred-1', provider: 'Notion', usage: 'research-notes' },
      { id: 'aurora-cred-2', provider: 'Google Drive', usage: 'reference-library' },
    ],
    runs: [
      { id: 'aurora-run-1', status: 'success', startedAt: Date.now() - 1000 * 60 * 60 },
      { id: 'aurora-run-2', status: 'failed', startedAt: Date.now() - 1000 * 60 * 120 },
      { id: 'aurora-run-3', status: 'running', startedAt: Date.now() - 1000 * 60 * 5 },
    ],
  },
  'workspace-cobalt': {
    agents: [
      {
        id: 'cobalt-agent-1',
        workspaceId: 'workspace-cobalt',
        name: 'Support Sentinel',
        description: 'Triages incoming support tickets and drafts responses.',
        status: 'active',
        tasksCompleted: 512,
        memoryItems: 320,
        lastActive: 'Just now',
      },
      {
        id: 'cobalt-agent-2',
        workspaceId: 'workspace-cobalt',
        name: 'Feedback Whisperer',
        description: 'Analyzes sentiment and trends across customer feedback.',
        status: 'learning',
        tasksCompleted: 204,
        memoryItems: 87,
        lastActive: '15 minutes ago',
      },
    ],
    workflows: [
      { id: 'cobalt-workflow-1', name: 'Ticket Summaries', status: 'active' },
    ],
    credentials: [
      { id: 'cobalt-cred-1', provider: 'Zendesk', usage: 'ticket-ingestion' },
    ],
    runs: [
      { id: 'cobalt-run-1', status: 'success', startedAt: Date.now() - 1000 * 60 * 30 },
    ],
  },
  'workspace-lumen': {
    agents: [
      {
        id: 'lumen-agent-1',
        workspaceId: 'workspace-lumen',
        name: 'Story Weaver',
        description: 'Co-creates branching narratives and lore expansions.',
        status: 'active',
        tasksCompleted: 78,
        memoryItems: 45,
        lastActive: '10 minutes ago',
      },
    ],
    workflows: [
      { id: 'lumen-workflow-1', name: 'Narrative Pitch', status: 'draft' },
    ],
    credentials: [
      { id: 'lumen-cred-1', provider: 'Figma', usage: 'worldbuilding-board' },
      { id: 'lumen-cred-2', provider: 'Slack', usage: 'creative-check-ins' },
    ],
    runs: [
      { id: 'lumen-run-1', status: 'success', startedAt: Date.now() - 1000 * 60 * 240 },
      { id: 'lumen-run-2', status: 'success', startedAt: Date.now() - 1000 * 60 * 480 },
    ],
  },
};

export const findUserByEmail = (email) =>
  users.find((user) => user.email.toLowerCase() === email.toLowerCase());

export const findUserById = (id) => users.find((user) => user.id === id);

export const getWorkspaceById = (id) => workspaces.find((workspace) => workspace.id === id);

export const getWorkspaceSummary = (workspaceId) => {
  const resources = workspaceResources[workspaceId];
  if (!resources) {
    return null;
  }

  return {
    agentCount: resources.agents.length,
    workflowCount: resources.workflows.length,
    credentialCount: resources.credentials.length,
    runCount: resources.runs.length,
  };
};
