import express from 'express';
import cors from 'cors';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import { corsOptions, serverConfig } from './config/serverConfig.js';
import logger from './logger.js';
import { mockAgents } from './mockAgents.js';
import {
  ALLOWED_AGENT_STATUSES,
  ALLOWED_MEMORY_TYPES,
  ALLOWED_TASK_STATUSES,
  createAgent,
  createMemory,
  createTask,
  deleteAgent,
  deleteMemory,
  deleteTask,
  getAgent,
  getMemory,
  getTask,
  listAgents,
  listMemory,
  listTasks,
  resetAll,
  touchAgent,
  updateAgent,
  updateMemory,
  updateTask,
} from './storage.js';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const DEFAULT_PORT = Number.isFinite(serverConfig.port) ? serverConfig.port : 3001;

export const createApp = () => {
  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json());

  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const sockets = new Set();
  const activeStreams = new Map();

  const broadcast = (event) => {
    const payload = JSON.stringify(event);
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    }
  };

  const emitAgentUpdate = (agentId) => {
    const agent = getAgent(agentId);
    if (agent) {
      broadcast({ type: 'agent.updated', data: agent });
    }
  };

  const clearStreams = () => {
    for (const timeout of activeStreams.values()) {
      clearTimeout(timeout);
    }
    activeStreams.clear();
  };

  if (listAgents().length === 0) {
    for (const agent of mockAgents) {
      try {
        createAgent({ name: agent.name, description: agent.description, status: agent.status });
      } catch (error) {
        logger.warn('Failed to seed mock agent', { agent: agent.name, error });
      }
    }
  }

  wss.on('connection', (socket) => {
    sockets.add(socket);
    socket.send(JSON.stringify({ type: 'connected' }));
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  const validateAgentStatus = (status) => {
    if (status !== undefined && !ALLOWED_AGENT_STATUSES.has(status)) {
      throw new HttpError(400, 'Invalid agent status');
    }
  };

  const validateTaskStatus = (status) => {
    if (status !== undefined && !ALLOWED_TASK_STATUSES.has(status)) {
      throw new HttpError(400, 'Invalid task status');
    }
  };

  const validateMemoryType = (type) => {
    if (type !== undefined && !ALLOWED_MEMORY_TYPES.has(type)) {
      throw new HttpError(400, 'Invalid memory type');
    }
  };

  const simulateTaskRun = (task) => {
    const steps = [
      'Task acknowledged by runtime.',
      'Planning execution strategy.',
      'Executing work units.',
      'Finalizing and reporting results.',
    ];

    steps.forEach((message, index) => {
      const key = `${task.id}-${index}`;
      const timeout = setTimeout(() => {
        broadcast({
          type: 'task.stream',
          data: {
            taskId: task.id,
            agentId: task.agentId,
            message,
            timestamp: new Date().toISOString(),
            step: index,
          },
        });

        if (index === steps.length - 1) {
          const completed = updateTask(task.id, { status: 'completed' });
          if (completed) {
            broadcast({ type: 'task.updated', data: completed });
            const touched = touchAgent(completed.agentId);
            if (touched) {
              broadcast({ type: 'agent.updated', data: touched });
            }
          }
        }

        activeStreams.delete(key);
      }, (index + 1) * 150);

      activeStreams.set(key, timeout);
    });
  };

  const handler = (fn) => (req, res, next) => {
    try {
      const maybePromise = fn(req, res, next);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };

  app.get(
    '/agents',
    handler((_req, res) => {
      const agents = listAgents();
      if (!Array.isArray(agents)) {
        throw new HttpError(500, 'Agent data unavailable');
      }
      res.json(agents);
    }),
  );

  app.post(
    '/agents',
    handler((req, res) => {
      const { name, description = '', status = 'inactive' } = req.body ?? {};
      if (!name || typeof name !== 'string') {
        throw new HttpError(400, 'Name is required');
      }
      validateAgentStatus(status);
      const agent = createAgent({ name, description, status });
      broadcast({ type: 'agent.created', data: agent });
      res.status(201).json(agent);
    }),
  );

  app.get(
    '/agents/:agentId',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      res.json(agent);
    }),
  );

  app.put(
    '/agents/:agentId',
    handler((req, res) => {
      const { name, description, status } = req.body ?? {};
      validateAgentStatus(status);
      const updated = updateAgent(req.params.agentId, { name, description, status });
      if (!updated) {
        throw new HttpError(404, 'Agent not found');
      }
      broadcast({ type: 'agent.updated', data: updated });
      res.json(updated);
    }),
  );

  app.delete(
    '/agents/:agentId',
    handler((req, res) => {
      const deleted = deleteAgent(req.params.agentId);
      if (!deleted) {
        throw new HttpError(404, 'Agent not found');
      }
      broadcast({ type: 'agent.deleted', data: { id: req.params.agentId } });
      res.status(204).send();
    }),
  );

  app.get(
    '/agents/:agentId/tasks',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      res.json(listTasks(req.params.agentId));
    }),
  );

  app.post(
    '/agents/:agentId/tasks',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      const { title, status = 'pending', log = '' } = req.body ?? {};
      if (!title || typeof title !== 'string') {
        throw new HttpError(400, 'Task title is required');
      }
      validateTaskStatus(status);
      const task = createTask(agent.id, { title, status, log });
      broadcast({ type: 'task.created', data: task });
      res.status(201).json(task);
    }),
  );

  app.patch(
    '/tasks/:taskId',
    handler((req, res) => {
      const { title, status, log } = req.body ?? {};
      validateTaskStatus(status);
      const updated = updateTask(req.params.taskId, { title, status, log });
      if (!updated) {
        throw new HttpError(404, 'Task not found');
      }
      if (status === 'completed' || status === 'failed') {
        const touched = touchAgent(updated.agentId);
        if (touched) {
          broadcast({ type: 'agent.updated', data: touched });
        }
      }
      broadcast({ type: 'task.updated', data: updated });
      res.json(updated);
    }),
  );

  app.delete(
    '/tasks/:taskId',
    handler((req, res) => {
      const task = getTask(req.params.taskId);
      if (!task) {
        throw new HttpError(404, 'Task not found');
      }
      deleteTask(req.params.taskId);
      broadcast({ type: 'task.deleted', data: { id: req.params.taskId, agentId: task.agentId } });
      emitAgentUpdate(task.agentId);
      res.status(204).send();
    }),
  );

  app.post(
    '/tasks/:taskId/run',
    handler((req, res) => {
      const task = getTask(req.params.taskId);
      if (!task) {
        throw new HttpError(404, 'Task not found');
      }
      if (task.status === 'running') {
        res.json(task);
        return;
      }
      const updated = updateTask(task.id, { status: 'running' });
      broadcast({ type: 'task.updated', data: updated });
      const touched = touchAgent(task.agentId);
      if (touched) {
        broadcast({ type: 'agent.updated', data: touched });
      }
      simulateTaskRun(updated);
      res.json(updated);
    }),
  );

  app.get(
    '/agents/:agentId/memory',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      res.json(listMemory(req.params.agentId));
    }),
  );

  app.post(
    '/agents/:agentId/memory',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      const { key, value, type = 'fact' } = req.body ?? {};
      if (!key || typeof key !== 'string') {
        throw new HttpError(400, 'Memory key is required');
      }
      if (!value || typeof value !== 'string') {
        throw new HttpError(400, 'Memory value is required');
      }
      validateMemoryType(type);
      const memory = createMemory(agent.id, { key, value, type });
      broadcast({ type: 'memory.created', data: memory });
      const touched = touchAgent(agent.id);
      if (touched) {
        broadcast({ type: 'agent.updated', data: touched });
      }
      res.status(201).json(memory);
    }),
  );

  app.patch(
    '/memory/:memoryId',
    handler((req, res) => {
      const { key, value, type } = req.body ?? {};
      validateMemoryType(type);
      const existing = getMemory(req.params.memoryId);
      if (!existing) {
        throw new HttpError(404, 'Memory item not found');
      }
      const updated = updateMemory(req.params.memoryId, { key, value, type });
      broadcast({ type: 'memory.updated', data: updated });
      const touched = touchAgent(existing.agentId);
      if (touched) {
        broadcast({ type: 'agent.updated', data: touched });
      } else {
        emitAgentUpdate(existing.agentId);
      }
      res.json(updated);
    }),
  );

  app.delete(
    '/memory/:memoryId',
    handler((req, res) => {
      const existing = getMemory(req.params.memoryId);
      if (!existing) {
        throw new HttpError(404, 'Memory item not found');
      }
      deleteMemory(req.params.memoryId);
      broadcast({ type: 'memory.deleted', data: { id: req.params.memoryId, agentId: existing.agentId } });
      const touched = touchAgent(existing.agentId);
      if (touched) {
        broadcast({ type: 'agent.updated', data: touched });
      } else {
        emitAgentUpdate(existing.agentId);
      }
      res.status(204).send();
    }),
  );

  if (process.env.NODE_ENV === 'test') {
    app.post(
      '/__test__/reset',
      handler((_req, res) => {
        resetAll();
        res.status(204).send();
      }),
    );
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }

    if (err?.message === 'Not allowed by CORS') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    logger.error('Unhandled error processing request', { error: err });
    res.status(500).json({ error: 'Internal server error' });
  });

  const close = () =>
    new Promise((resolve) => {
      clearStreams();
      for (const socket of sockets) {
        try {
          socket.close();
        } catch (error) {
          logger.warn('Failed to close websocket connection', { error });
        }
      }
      wss.close(() => {
        httpServer.close(() => resolve());
      });
    });

  return Object.assign(app, { app, server: httpServer, wss, close, broadcast });
};

export const startAgentRuntime = ({ port = DEFAULT_PORT, onListen } = {}) => {
  const appInstance = createApp();
  appInstance.server.listen(port, () => {
    if (typeof onListen === 'function') {
      onListen({ port });
    } else {
      logger.info('API server started', { port, url: `http://localhost:${port}` });
    }
  });
  return appInstance;
};

export { HttpError };
