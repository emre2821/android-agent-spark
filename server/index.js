import express from 'express';
import cors from 'cors';
import { mockAgents } from './mockAgents.js';
import { mockWorkflows } from './mockWorkflows.js';

const app = express();
app.use(cors());
app.use(express.json());

let workflows = [...mockWorkflows];

app.get('/agents', (req, res) => {
  res.json(mockAgents);
});

app.get('/workflows', (req, res) => {
  res.json(workflows);
});

app.get('/workflows/:id', (req, res) => {
  const workflow = workflows.find((wf) => wf.id === req.params.id);
  if (!workflow) {
    res.status(404).json({ message: 'Workflow not found' });
    return;
  }
  res.json(workflow);
});

app.post('/workflows', (req, res) => {
  const payload = req.body || {};
  const now = new Date().toISOString();
  const newWorkflow = {
    id: payload.id || `wf-${Date.now()}`,
    name: payload.name,
    description: payload.description || '',
    status: payload.status || 'draft',
    version: payload.version || 1,
    triggerId: payload.triggerId || payload.nodes?.[0]?.id,
    nodes: payload.nodes || [],
    edges: payload.edges || [],
    inputs: payload.inputs || [],
    outputs: payload.outputs || [],
    createdAt: payload.createdAt || now,
    updatedAt: now,
    execution: {
      runCount: payload.execution?.runCount ?? 0,
      lastRunAt: payload.execution?.lastRunAt,
      nextRunAt: payload.execution?.nextRunAt,
      schedule: payload.execution?.schedule,
      lastRunStatus: payload.execution?.lastRunStatus || 'idle',
    },
    metadata: {
      tags: payload.metadata?.tags || [],
      owner: payload.metadata?.owner,
      category: payload.metadata?.category,
    },
  };

  workflows.push(newWorkflow);
  res.status(201).json(newWorkflow);
});

app.put('/workflows/:id', (req, res) => {
  const index = workflows.findIndex((wf) => wf.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ message: 'Workflow not found' });
    return;
  }

  const existing = workflows[index];
  const payload = req.body || {};
  const now = new Date().toISOString();

  const updated = {
    ...existing,
    ...payload,
    id: existing.id,
    version: payload.version ?? existing.version,
    updatedAt: now,
    nodes: payload.nodes ?? existing.nodes,
    edges: payload.edges ?? existing.edges,
    inputs: payload.inputs ?? existing.inputs,
    outputs: payload.outputs ?? existing.outputs,
    execution: {
      ...existing.execution,
      ...payload.execution,
    },
    metadata: {
      ...existing.metadata,
      ...payload.metadata,
      tags: payload.metadata?.tags ?? existing.metadata.tags,
    },
  };

  workflows[index] = updated;
  res.json(updated);
});

app.post('/workflows/:id/publish', (req, res) => {
  const index = workflows.findIndex((wf) => wf.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ message: 'Workflow not found' });
    return;
  }

  const now = new Date().toISOString();
  const workflow = workflows[index];
  const published = {
    ...workflow,
    status: 'published',
    version: workflow.version + 1,
    updatedAt: now,
    execution: {
      ...workflow.execution,
      lastRunStatus: 'idle',
    },
  };

  workflows[index] = published;
  res.json(published);
});

app.post('/workflows/:id/duplicate', (req, res) => {
  const workflow = workflows.find((wf) => wf.id === req.params.id);
  if (!workflow) {
    res.status(404).json({ message: 'Workflow not found' });
    return;
  }

  const now = new Date().toISOString();
  const duplicate = {
    ...workflow,
    id: `wf-${Date.now()}`,
    name: `${workflow.name} Copy`,
    status: 'draft',
    version: 1,
    createdAt: now,
    updatedAt: now,
    execution: {
      ...workflow.execution,
      runCount: 0,
      lastRunAt: undefined,
      nextRunAt: undefined,
      lastRunStatus: 'idle',
    },
  };

  workflows.push(duplicate);
  res.status(201).json(duplicate);
});

app.delete('/workflows/:id', (req, res) => {
  const index = workflows.findIndex((wf) => wf.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ message: 'Workflow not found' });
    return;
  }

  workflows.splice(index, 1);
  res.status(204).end();
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
