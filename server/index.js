import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

export const createApp = () => {
  const app = express();
  app.use(cors());

  app.get('/agents', (req, res) => {
    res.json(mockAgents);
  });

  return app;
};

const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}

export default app;
const app = express();
app.use(cors());
app.use(express.json());



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
