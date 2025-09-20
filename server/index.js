import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
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

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(event, payload) {
  const message = JSON.stringify({ event, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ event: 'connected', payload: { timestamp: Date.now() } }));
});

app.get('/agents', async (req, res) => {
  try {
    const agents = await listAgents();
    res.json(agents);
  } catch (error) {
    console.error('Failed to list agents', error);
    res.status(500).json({ message: 'Failed to list agents' });
  }
});

app.get('/agents/:id', async (req, res) => {
  try {
    const agent = await getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Failed to load agent', error);
    res.status(500).json({ message: 'Failed to load agent' });
  }
});

app.post('/agents', async (req, res) => {
  try {
    const agent = await createAgent(req.body ?? {});
    broadcast('agent:created', agent);
    res.status(201).json(agent);
  } catch (error) {
    console.error('Failed to create agent', error);
    res.status(500).json({ message: 'Failed to create agent' });
  }
});

app.put('/agents/:id', async (req, res) => {
  try {
    const agent = await updateAgent(req.params.id, req.body ?? {});
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    broadcast('agent:updated', agent);
    res.json(agent);
  } catch (error) {
    console.error('Failed to update agent', error);
    res.status(500).json({ message: 'Failed to update agent' });
  }
});

app.delete('/agents/:id', async (req, res) => {
  try {
    const success = await deleteAgent(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    broadcast('agent:deleted', { id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete agent', error);
    res.status(500).json({ message: 'Failed to delete agent' });
  }
});

app.get('/agents/:id/tasks', async (req, res) => {
  try {
    const tasks = await listTasks(req.params.id);
    res.json(tasks);
  } catch (error) {
    console.error('Failed to list tasks', error);
    res.status(500).json({ message: 'Failed to list tasks' });
  }
});

app.post('/agents/:id/tasks', async (req, res) => {
  try {
    const result = await createTask(req.params.id, req.body ?? {});
    broadcast('task:created', { agentId: req.params.id, task: result.task });
    broadcast('agent:updated', result.agent);
    res.status(201).json(result);
  } catch (error) {
    console.error('Failed to create task', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

app.put('/agents/:id/tasks/:taskId', async (req, res) => {
  try {
    const result = await updateTask(req.params.id, req.params.taskId, req.body ?? {});
    if (!result) {
      return res.status(404).json({ message: 'Task not found' });
    }
    broadcast('task:updated', { agentId: req.params.id, task: result.task });
    broadcast('agent:updated', result.agent);
    res.json(result);
  } catch (error) {
    console.error('Failed to update task', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

app.delete('/agents/:id/tasks/:taskId', async (req, res) => {
  try {
    const result = await deleteTask(req.params.id, req.params.taskId);
    if (!result) {
      return res.status(404).json({ message: 'Task not found' });
    }
    broadcast('task:deleted', { agentId: req.params.id, taskId: req.params.taskId });
    broadcast('agent:updated', result.agent);
    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete task', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

app.get('/agents/:id/memory', async (req, res) => {
  try {
    const memory = await listMemories(req.params.id);
    res.json(memory);
  } catch (error) {
    console.error('Failed to list memory', error);
    res.status(500).json({ message: 'Failed to list memory' });
  }
});

app.post('/agents/:id/memory', async (req, res) => {
  try {
    const result = await createMemory(req.params.id, req.body ?? {});
    broadcast('memory:created', { agentId: req.params.id, memory: result.memory });
    broadcast('agent:updated', result.agent);
    res.status(201).json(result);
  } catch (error) {
    console.error('Failed to create memory', error);
    res.status(500).json({ message: 'Failed to create memory' });
  }
});

app.put('/agents/:id/memory/:memoryId', async (req, res) => {
  try {
    const result = await updateMemory(req.params.id, req.params.memoryId, req.body ?? {});
    if (!result) {
      return res.status(404).json({ message: 'Memory item not found' });
    }
    broadcast('memory:updated', { agentId: req.params.id, memory: result.memory });
    broadcast('agent:updated', result.agent);
    res.json(result);
  } catch (error) {
    console.error('Failed to update memory', error);
    res.status(500).json({ message: 'Failed to update memory' });
  }
});

app.delete('/agents/:id/memory/:memoryId', async (req, res) => {
  try {
    const result = await deleteMemory(req.params.id, req.params.memoryId);
    if (!result) {
      return res.status(404).json({ message: 'Memory item not found' });
    }
    broadcast('memory:deleted', { agentId: req.params.id, memoryId: req.params.memoryId });
    broadcast('agent:updated', result.agent);
    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete memory', error);
    res.status(500).json({ message: 'Failed to delete memory' });
  }
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
