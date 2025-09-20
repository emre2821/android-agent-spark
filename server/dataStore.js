import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'db.json');

const defaultData = {
  agents: [
    {
      id: '1',
      name: 'Task Automator',
      description: 'Automates daily tasks and workflows with intelligent decision making',
      status: 'active',
      lastActive: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      name: 'Data Collector',
      description: 'Gathers and organizes information from multiple sources',
      status: 'learning',
      lastActive: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      name: 'Smart Assistant',
      description: 'Provides intelligent responses and performs complex reasoning',
      status: 'inactive',
      lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  tasks: [
    {
      id: 't-1',
      agentId: '1',
      title: 'Process inbox triage',
      status: 'completed',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: 't-2',
      agentId: '2',
      title: 'Collect website metrics',
      status: 'running',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ],
  memories: [
    {
      id: 'm-1',
      agentId: '1',
      key: 'user_timezone',
      value: 'UTC-8 (Pacific Time)',
      type: 'fact',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'm-2',
      agentId: '1',
      key: 'preferred_notification_channel',
      value: 'Slack #ops channel',
      type: 'preference',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'm-3',
      agentId: '2',
      key: 'data_refresh_window',
      value: 'Every hour between 9am-6pm PST',
      type: 'context',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

async function ensureStore() {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  if (!existsSync(dataFile)) {
    await writeFile(dataFile, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

async function readStore() {
  await ensureStore();
  const raw = await readFile(dataFile, 'utf-8');
  return JSON.parse(raw);
}

async function writeStore(data) {
  await ensureStore();
  await writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

function formatRelativeTime(isoString) {
  if (!isoString) return 'Unknown';
  const target = new Date(isoString);
  if (Number.isNaN(target.getTime())) {
    return 'Unknown';
  }
  const diff = Date.now() - target.getTime();
  const minutes = Math.round(diff / (60 * 1000));
  if (minutes <= 0) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function hydrateAgent(agent, tasks, memories) {
  const agentTasks = tasks.filter((task) => task.agentId === agent.id);
  const completedTasks = agentTasks.filter((task) => task.status === 'completed').length;
  const memoryCount = memories.filter((memory) => memory.agentId === agent.id).length;

  return {
    ...agent,
    tasksCompleted: completedTasks,
    memoryItems: memoryCount,
    lastActive: formatRelativeTime(agent.lastActive),
  };
}

async function getHydratedAgent(data, agentId) {
  const agent = data.agents.find((item) => item.id === agentId);
  if (!agent) return null;
  return hydrateAgent(agent, data.tasks, data.memories);
}

async function touchAgent(data, agentId) {
  const agent = data.agents.find((item) => item.id === agentId);
  if (agent) {
    agent.lastActive = new Date().toISOString();
  }
}

export async function listAgents() {
  const data = await readStore();
  return data.agents.map((agent) => hydrateAgent(agent, data.tasks, data.memories));
}

export async function getAgent(agentId) {
  const data = await readStore();
  return getHydratedAgent(data, agentId);
}

export async function createAgent(payload) {
  const data = await readStore();
  const id = randomUUID();
  const newAgent = {
    id,
    name: payload.name,
    description: payload.description ?? '',
    status: payload.status ?? 'inactive',
    lastActive: new Date().toISOString(),
  };
  data.agents.push(newAgent);
  await writeStore(data);
  return hydrateAgent(newAgent, data.tasks, data.memories);
}

export async function updateAgent(agentId, updates) {
  const data = await readStore();
  const agentIndex = data.agents.findIndex((item) => item.id === agentId);
  if (agentIndex === -1) return null;
  const current = data.agents[agentIndex];
  const updated = {
    ...current,
    ...updates,
    id: agentId,
  };
  data.agents[agentIndex] = updated;
  await touchAgent(data, agentId);
  await writeStore(data);
  return hydrateAgent(updated, data.tasks, data.memories);
}

export async function deleteAgent(agentId) {
  const data = await readStore();
  const agentIndex = data.agents.findIndex((item) => item.id === agentId);
  if (agentIndex === -1) return false;
  data.agents.splice(agentIndex, 1);
  data.tasks = data.tasks.filter((task) => task.agentId !== agentId);
  data.memories = data.memories.filter((memory) => memory.agentId !== agentId);
  await writeStore(data);
  return true;
}

export async function listTasks(agentId) {
  const data = await readStore();
  return data.tasks.filter((task) => task.agentId === agentId);
}

export async function createTask(agentId, payload) {
  const data = await readStore();
  const task = {
    id: randomUUID(),
    agentId,
    title: payload.title,
    status: payload.status ?? 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.tasks.push(task);
  await touchAgent(data, agentId);
  await writeStore(data);
  const agent = await getHydratedAgent(data, agentId);
  return { task, agent };
}

export async function updateTask(agentId, taskId, payload) {
  const data = await readStore();
  const index = data.tasks.findIndex((task) => task.id === taskId && task.agentId === agentId);
  if (index === -1) return null;
  const current = data.tasks[index];
  const updated = {
    ...current,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  data.tasks[index] = updated;
  await touchAgent(data, agentId);
  await writeStore(data);
  const agent = await getHydratedAgent(data, agentId);
  return { task: updated, agent };
}

export async function deleteTask(agentId, taskId) {
  const data = await readStore();
  const initialLength = data.tasks.length;
  data.tasks = data.tasks.filter((task) => !(task.id === taskId && task.agentId === agentId));
  if (data.tasks.length === initialLength) return null;
  await touchAgent(data, agentId);
  await writeStore(data);
  const agent = await getHydratedAgent(data, agentId);
  return { success: true, agent };
}

export async function listMemories(agentId) {
  const data = await readStore();
  return data.memories
    .filter((memory) => memory.agentId === agentId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createMemory(agentId, payload) {
  const data = await readStore();
  const memory = {
    id: randomUUID(),
    agentId,
    key: payload.key,
    value: payload.value,
    type: payload.type ?? 'fact',
    timestamp: new Date().toISOString(),
  };
  data.memories.push(memory);
  await touchAgent(data, agentId);
  await writeStore(data);
  const agent = await getHydratedAgent(data, agentId);
  return { memory, agent };
}

export async function updateMemory(agentId, memoryId, payload) {
  const data = await readStore();
  const index = data.memories.findIndex((memory) => memory.id === memoryId && memory.agentId === agentId);
  if (index === -1) return null;
  const current = data.memories[index];
  const updated = {
    ...current,
    ...payload,
    timestamp: new Date().toISOString(),
  };
  data.memories[index] = updated;
  await touchAgent(data, agentId);
  await writeStore(data);
  const agent = await getHydratedAgent(data, agentId);
  return { memory: updated, agent };
}

export async function deleteMemory(agentId, memoryId) {
  const data = await readStore();
  const initialLength = data.memories.length;
  data.memories = data.memories.filter((memory) => !(memory.id === memoryId && memory.agentId === agentId));
  if (data.memories.length === initialLength) return null;
  await touchAgent(data, agentId);
  await writeStore(data);
  const agent = await getHydratedAgent(data, agentId);
  return { success: true, agent };
}
