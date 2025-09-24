import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listMemories,
  createMemory,
  updateMemory,
  deleteMemory,
} from './dataStore.js';
import {
  listWorkflows,
  getWorkflow as getStoredWorkflow,
  createWorkflow as createStoredWorkflow,
  updateWorkflow as updateStoredWorkflow,
  deleteWorkflow as deleteStoredWorkflow,
  upsertWorkflow,
  listWorkflowTriggers,
  createWorkflowTrigger,
  updateWorkflowTrigger,
  deleteWorkflowTrigger,
  listWorkflowRuns,
} from './workflowStore.js';
import { triggerEngine } from './triggerEngine.js';
import {
  triggerInputSchema,
  triggerUpdateSchema,
  workflowInputSchema,
  workflowUpdateSchema,
  queuePublishSchema,
} from './validation/workflowSchemas.js';

const app = express();
app.use(cors());
app.use(express.json());

const apiRouter = express.Router();

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(event, payload) {
  if (!event) return;
  const message = JSON.stringify({ event, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Failed to broadcast message', error);
      }
    }
  });
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

apiRouter.get(
  '/agents',
  asyncHandler(async (req, res) => {
    const agents = await listAgents();
    res.json({ data: agents });
  }),
);

apiRouter.get(
  '/workflows',
  asyncHandler(async (req, res) => {
    const workflows = await listWorkflows();
    res.json({ data: workflows });
  }),
);

apiRouter.post(
  '/workflows',
  asyncHandler(async (req, res) => {
    const payload = workflowInputSchema.parse(req.body ?? {});
    const workflow = await createStoredWorkflow(payload);
    await triggerEngine.syncWorkflow(workflow);
    res.status(201).json({ data: workflow });
  }),
);

apiRouter.put(
  '/workflows/:workflowId',
  asyncHandler(async (req, res) => {
    const payload = workflowInputSchema.parse({ ...req.body, id: req.params.workflowId });
    const workflow = await upsertWorkflow(req.params.workflowId, payload);
    await triggerEngine.syncWorkflow(workflow);
    res.status(200).json({ data: workflow });
  }),
);

apiRouter.get(
  '/workflows/:workflowId',
  asyncHandler(async (req, res) => {
    const workflow = await getStoredWorkflow(req.params.workflowId);
    if (!workflow) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }
    res.json({ data: workflow });
  }),
);

apiRouter.patch(
  '/workflows/:workflowId',
  asyncHandler(async (req, res) => {
    const payload = workflowUpdateSchema.parse(req.body ?? {});
    const workflow = await updateStoredWorkflow(req.params.workflowId, payload);
    if (!workflow) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }
    await triggerEngine.syncWorkflow(workflow);
    res.json({ data: workflow });
  }),
);

apiRouter.delete(
  '/workflows/:workflowId',
  asyncHandler(async (req, res) => {
    const deleted = await deleteStoredWorkflow(req.params.workflowId);
    if (!deleted) {
      res.status(404).json({ message: 'Workflow not found' });
      return;
    }
    await triggerEngine.unregisterWorkflow(req.params.workflowId);
    res.status(204).send();
  }),
);

apiRouter.get(
  '/workflows/:workflowId/triggers',
  asyncHandler(async (req, res) => {
    const triggers = await listWorkflowTriggers(req.params.workflowId);
    res.json({ data: triggers });
  }),
);

apiRouter.post(
  '/workflows/:workflowId/triggers',
  asyncHandler(async (req, res) => {
    const payload = triggerInputSchema.parse(req.body ?? {});
    const trigger = await createWorkflowTrigger(req.params.workflowId, payload);
    const workflow = await getStoredWorkflow(req.params.workflowId);
    if (workflow) {
      await triggerEngine.refreshTrigger(req.params.workflowId, trigger);
    }
    res.status(201).json({ data: trigger });
  }),
);

apiRouter.patch(
  '/workflows/:workflowId/triggers/:triggerId',
  asyncHandler(async (req, res) => {
    const payload = triggerUpdateSchema.parse(req.body ?? {});
    const trigger = await updateWorkflowTrigger(req.params.workflowId, req.params.triggerId, payload);
    await triggerEngine.refreshTrigger(req.params.workflowId, trigger);
    res.json({ data: trigger });
  }),
);

apiRouter.delete(
  '/workflows/:workflowId/triggers/:triggerId',
  asyncHandler(async (req, res) => {
    await deleteWorkflowTrigger(req.params.workflowId, req.params.triggerId);
    await triggerEngine.unregisterTrigger(req.params.triggerId);
    res.status(204).send();
  }),
);

apiRouter.get(
  '/workflows/:workflowId/runs',
  asyncHandler(async (req, res) => {
    const runs = await listWorkflowRuns(req.params.workflowId);
    res.json({ data: runs });
  }),
);

apiRouter.post(
  '/triggers/queue/:queueName/publish',
  asyncHandler(async (req, res) => {
    const payload = queuePublishSchema.parse(req.body ?? {});
    await triggerEngine.publishToQueue(req.params.queueName, payload.payload ?? null);
    res.status(202).json({ message: 'Message enqueued' });
  }),
);

apiRouter.post(
  '/agents',
  asyncHandler(async (req, res) => {
    const agent = await createAgent(req.body ?? {});
    broadcast('agent:created', { agent });
    res.status(201).json({ data: agent });
  }),
);

apiRouter.get(
  '/agents/:id',
  asyncHandler(async (req, res) => {
    const agent = await getAgent(req.params.id);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }
    res.json({ data: agent });
  }),
);

apiRouter.patch(
  '/agents/:id',
  asyncHandler(async (req, res) => {
    const agent = await updateAgent(req.params.id, req.body ?? {});
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }
    broadcast('agent:updated', { agent });
    res.json({ data: agent });
  }),
);

apiRouter.delete(
  '/agents/:id',
  asyncHandler(async (req, res) => {
    const deleted = await deleteAgent(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }
    broadcast('agent:deleted', { id: req.params.id });
    res.status(204).send();
  }),
);

apiRouter.get(
  '/agents/:agentId/tasks',
  asyncHandler(async (req, res) => {
    const agent = await getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }
    const tasks = await listTasks(req.params.agentId);
    res.json({ data: tasks });
  }),
);

apiRouter.post(
  '/agents/:agentId/tasks',
  asyncHandler(async (req, res) => {
    const agent = await getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }
    const result = await createTask(req.params.agentId, req.body ?? {});
    broadcast('task:created', { agent: result.agent, task: result.task });
    res.status(201).json({ data: result });
  }),
);

apiRouter.patch(
  '/agents/:agentId/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const result = await updateTask(req.params.agentId, req.params.taskId, req.body ?? {});
    if (!result) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    broadcast('task:updated', { agent: result.agent, task: result.task });
    res.json({ data: result });
  }),
);

apiRouter.delete(
  '/agents/:agentId/tasks/:taskId',
  asyncHandler(async (req, res) => {
    const result = await deleteTask(req.params.agentId, req.params.taskId);
    if (!result) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    broadcast('task:deleted', { agentId: req.params.agentId, taskId: req.params.taskId, agent: result.agent });
    res.status(204).send();
  }),
);

apiRouter.get(
  '/agents/:agentId/memory',
  asyncHandler(async (req, res) => {
    const agent = await getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }
    const memories = await listMemories(req.params.agentId);
    res.json({ data: memories });
  }),
);

apiRouter.post(
  '/agents/:agentId/memory',
  asyncHandler(async (req, res) => {
    const agent = await getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }
    const result = await createMemory(req.params.agentId, req.body ?? {});
    broadcast('memory:created', { agent: result.agent, memory: result.memory });
    res.status(201).json({ data: result });
  }),
);

apiRouter.patch(
  '/agents/:agentId/memory/:memoryId',
  asyncHandler(async (req, res) => {
    const result = await updateMemory(req.params.agentId, req.params.memoryId, req.body ?? {});
    if (!result) {
      res.status(404).json({ message: 'Memory not found' });
      return;
    }
    broadcast('memory:updated', { agent: result.agent, memory: result.memory });
    res.json({ data: result });
  }),
);

apiRouter.delete(
  '/agents/:agentId/memory/:memoryId',
  asyncHandler(async (req, res) => {
    const result = await deleteMemory(req.params.agentId, req.params.memoryId);
    if (!result) {
      res.status(404).json({ message: 'Memory not found' });
      return;
    }
    broadcast('memory:deleted', { agentId: req.params.agentId, memoryId: req.params.memoryId, agent: result.agent });
    res.status(204).send();
  }),
);

app.use('/api', apiRouter);

app.post(
  '/triggers/webhook/:triggerId',
  asyncHandler(async (req, res) => {
    await triggerEngine.handleWebhook(req.params.triggerId, {
      headers: req.headers,
      body: req.body,
      query: req.query,
    });
    res.status(202).json({ message: 'Webhook accepted' });
  }),
);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error processing request', err);
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

wss.on('connection', (socket) => {
  socket.on('error', (error) => {
    console.error('WebSocket error', error);
  });
  socket.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

wss.on('error', (error) => {
  console.error('WebSocket server error', error);
});

server.on('error', (error) => {
  console.error('Server error', error);
});

const DEFAULT_PORT = Number.parseInt(process.env.PORT ?? '3001', 10);

export function startServer(port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    if (server.listening) {
      resolve(server);
      return;
    }

    const handleListening = async () => {
      server.off('error', handleError);
      try {
        await triggerEngine.initialize();
      } catch (error) {
        console.error('Failed to initialize trigger engine', error);
      }
      console.log(`API server running on http://localhost:${port}`);
      resolve(server);
    };

    const handleError = (error) => {
      server.off('listening', handleListening);
      reject(error);
    };

    server.once('error', handleError);
    server.once('listening', handleListening);
    server.listen(port);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error('Failed to start server', error);
    process.exitCode = 1;
  });
}

export { app, server, wss };
