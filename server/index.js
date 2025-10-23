import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  workspaces,
  workspaceResources,
  findUserByEmail,
  findUserById,
  getWorkspaceById,
  getWorkspaceSummary,
} from './data.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_TTL = '4h';

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

const buildWorkspacePayload = (memberships) =>
  memberships
    .map((membership) => {
      const workspace = getWorkspaceById(membership.id);
      if (!workspace) {
        return null;
      }
      const summary = getWorkspaceSummary(membership.id);
      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        role: membership.role,
        summary,
      };
    })
    .filter(Boolean);

export const createServer = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = findUserById(payload.userId);
      if (!user) {
        return res.status(401).json({ message: 'Invalid authentication token.' });
      }

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        workspaces: user.workspaces,
      };

      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }
  };

  const authorizeWorkspace = (req, res, next) => {
    const { workspaceId } = req.params;
    const membership = req.user.workspaces.find((item) => item.id === workspaceId);

    if (!membership) {
      return res.status(403).json({ message: 'You do not have access to this workspace.' });
    }

    const workspace = getWorkspaceById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const resources = workspaceResources[workspaceId];
    if (!resources) {
      return res.status(404).json({ message: 'Workspace resources not found.' });
    }

    req.workspace = workspace;
    req.workspaceMembership = membership;
    req.workspaceResources = resources;

    return next();
  };

  const requireWorkspaceRole = (minimumRole) => {
    const roleOrder = ['viewer', 'editor', 'admin', 'owner'];
    const minimumIndex = roleOrder.indexOf(minimumRole);

    if (minimumIndex === -1) {
      throw new Error(`Unknown workspace role: ${minimumRole}`);
    }

    return (req, res, next) => {
      const membershipRole = req.workspaceMembership?.role;
      const membershipIndex = roleOrder.indexOf(membershipRole);

      if (membershipIndex === -1 || membershipIndex < minimumIndex) {
        return res.status(403).json({ message: 'You do not have permission to access this resource.' });
      }

      return next();
    };
  };

  app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });

    return res.json({
      token,
      user: sanitizeUser(user),
      workspaces: buildWorkspacePayload(user.workspaces),
    });
  });

  app.get('/auth/me', authenticate, (req, res) => {
    return res.json({
      user: sanitizeUser(req.user),
      workspaces: buildWorkspacePayload(req.user.workspaces),
    });
  });

  app.get('/workspaces', authenticate, (req, res) => {
    return res.json(buildWorkspacePayload(req.user.workspaces));
  });

  app.get('/workspaces/:workspaceId', authenticate, authorizeWorkspace, (req, res) => {
    return res.json({
      ...req.workspace,
      role: req.workspaceMembership.role,
      summary: getWorkspaceSummary(req.workspace.id),
    });
  });

  app.get('/workspaces/:workspaceId/agents', authenticate, authorizeWorkspace, (req, res) => {
    return res.json(req.workspaceResources.agents);
  });

  app.get(
    '/workspaces/:workspaceId/workflows',
    authenticate,
    authorizeWorkspace,
    requireWorkspaceRole('editor'),
    (req, res) => {
      return res.json(req.workspaceResources.workflows);
    },
  );

  app.get(
    '/workspaces/:workspaceId/credentials',
    authenticate,
    authorizeWorkspace,
    requireWorkspaceRole('editor'),
    (req, res) => {
      return res.json(req.workspaceResources.credentials);
    },
  );

  app.get(
    '/workspaces/:workspaceId/runs',
    authenticate,
    authorizeWorkspace,
    requireWorkspaceRole('editor'),
    (req, res) => {
      return res.json(req.workspaceResources.runs);
    },
  );

  return app;
};

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3001;
  const app = createServer();
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
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

const DEFAULT_PORT = Number(process.env.PORT) || 3001;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const createApp = () => {
  const app = express();
  app.use(cors());
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
      }, (index + 1) * 150);
      activeStreams.set(`${task.id}-${index}`, timeout);
    });
  };

  const handler = (fn) => (req, res, next) => {
    try {
      const maybePromise = fn(req, res, next);
      if (maybePromise?.then) {
        maybePromise.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };

  app.get(
    '/agents',
    handler((_req, res) => {
      res.json(listAgents());
    })
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
    })
  );

  app.get(
    '/agents/:agentId',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      res.json(agent);
    })
  );

  app.put(
    '/agents/:agentId',
    handler((req, res) => {
      const { name, description, status } = req.body ?? {};
      validateAgentStatus(status);
      const updated = updateAgent(req.params.agentId, {
        name,
        description,
        status,
      });
      if (!updated) {
        throw new HttpError(404, 'Agent not found');
      }
      broadcast({ type: 'agent.updated', data: updated });
      res.json(updated);
    })
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
    })
  );

  app.get(
    '/agents/:agentId/tasks',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      res.json(listTasks(req.params.agentId));
    })
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
    })
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
    })
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
    })
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
    })
  );

  app.get(
    '/agents/:agentId/memory',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      res.json(listMemory(req.params.agentId));
    })
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
    })
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
    })
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
    })
  );

  if (process.env.NODE_ENV === 'test') {
    app.post(
      '/__test__/reset',
      handler((_req, res) => {
        resetAll();
        res.status(204).send();
      })
    );
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const close = () =>
    new Promise((resolve) => {
      clearStreams();
      for (const socket of sockets) {
        try {
          socket.close();
        } catch (error) {
          console.error('Error closing socket', error);
        }
      }
      wss.close(() => {
        httpServer.close(() => resolve());
      });
    });

  return { app, server: httpServer, wss, close, broadcast };
};

if (process.env.NODE_ENV !== 'test') {
  const { server } = createApp();
  server.listen(DEFAULT_PORT, () => {
    console.log(`API server running on http://localhost:${DEFAULT_PORT}`);
  });
}

export { createApp, HttpError };

const DEFAULT_PORT = Number(process.env.PORT) || 3001;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const createApp = () => {
  const app = express();
  app.use(cors());
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
      }, (index + 1) * 150);
      activeStreams.set(`${task.id}-${index}`, timeout);
    });
  };

  const handler = (fn) => (req, res, next) => {
    try {
      const maybePromise = fn(req, res, next);
      if (maybePromise?.then) {
        maybePromise.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };

  app.get(
    '/agents',
    handler((_req, res) => {
      res.json(listAgents());
    })
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
    })
  );

  app.get(
    '/agents/:agentId',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      res.json(agent);
    })
  );

  app.put(
    '/agents/:agentId',
    handler((req, res) => {
      const { name, description, status } = req.body ?? {};
      validateAgentStatus(status);
      const updated = updateAgent(req.params.agentId, {
        name,
        description,
        status,
      });
      if (!updated) {
        throw new HttpError(404, 'Agent not found');
      }
      broadcast({ type: 'agent.updated', data: updated });
      res.json(updated);
    })
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
    })
  );

  app.get(
    '/agents/:agentId/tasks',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      res.json(listTasks(req.params.agentId));
    })
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
    })
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
    })
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
    })
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
    })
  );

  app.get(
    '/agents/:agentId/memory',
    handler((req, res) => {
      const agent = getAgent(req.params.agentId);
      if (!agent) {
        throw new HttpError(404, 'Agent not found');
      }
      res.json(listMemory(req.params.agentId));
    })
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
    })
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
    })
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
    })
  );

  app.post(
    '/__test__/reset',
    handler((_req, res) => {
      resetAll();
      res.status(204).send();
    })
  );

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const close = () =>
    new Promise((resolve) => {
      clearStreams();
      for (const socket of sockets) {
        try {
          socket.close();
        } catch (error) {
          console.error('Error closing socket', error);
        }
      }
      wss.close(() => {
        httpServer.close(() => resolve());
      });
    });

  return { app, server: httpServer, wss, close, broadcast };
};

if (process.env.NODE_ENV !== 'test') {
  const { server } = createApp();
  server.listen(DEFAULT_PORT, () => {
    console.log(`API server running on http://localhost:${DEFAULT_PORT}`);
  });
}

export { createApp, HttpError };
import { mockAgents } from './mockAgents.js';
import { workflowStore } from './workflowStore.js';
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
