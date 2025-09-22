import express from 'express';
import cors from 'cors';
import { mockAgents } from './mockAgents.js';
import { workflowStore } from './workflowStore.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/agents', (req, res) => {
  res.json(mockAgents);
});

app.get('/workflow-runs', async (req, res) => {
  try {
    const runs = await workflowStore.getAllRuns();
    res.json(runs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/workflow-runs/:id', async (req, res) => {
  try {
    const run = await workflowStore.getRun(req.params.id);
    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }
    res.json(run);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/workflow-runs', async (req, res) => {
  try {
    const run = await workflowStore.createRun(req.body);
    res.status(201).json(run);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/workflow-runs/:id/steps/:stepId/logs', async (req, res) => {
  try {
    const entry = await workflowStore.appendStepLog(req.params.id, req.params.stepId, req.body);
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/workflow-runs/:id/steps/:stepId/result', async (req, res) => {
  try {
    const run = await workflowStore.recordStepResult(req.params.id, req.params.stepId, req.body);
    res.json(run);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/workflow-runs/:id/retry', async (req, res) => {
  try {
    const run = await workflowStore.retryRun(req.params.id, req.body?.reason);
    res.json(run);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/workflow-runs/:id/cancel', async (req, res) => {
  try {
    const run = await workflowStore.cancelRun(req.params.id, req.body?.reason);
    res.json(run);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
