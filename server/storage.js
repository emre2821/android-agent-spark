import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultPath = path.join(__dirname, 'data', 'agents.db');
const dbPath = process.env.AGENT_DB_PATH || defaultPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const database = new Database(dbPath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');

database.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL,
    last_active TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    log TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS memory (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );
`);

const ALLOWED_AGENT_STATUSES = new Set(['active', 'inactive', 'learning']);
const ALLOWED_TASK_STATUSES = new Set(['pending', 'running', 'completed', 'failed']);
const ALLOWED_MEMORY_TYPES = new Set(['fact', 'preference', 'skill', 'context']);

const nowIso = () => new Date().toISOString();

const mapAgentRow = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  status: row.status,
  lastActive: row.last_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapTaskRow = (row) => ({
  id: row.id,
  agentId: row.agent_id,
  title: row.title,
  status: row.status,
  log: row.log ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMemoryRow = (row) => ({
  id: row.id,
  agentId: row.agent_id,
  key: row.key,
  value: row.value,
  type: row.type,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const countCompletedTasksStmt = database.prepare(
  'SELECT COUNT(*) as count FROM tasks WHERE agent_id = ? AND status = ?'
);

const countMemoryStmt = database.prepare(
  'SELECT COUNT(*) as count FROM memory WHERE agent_id = ?'
);

const getAgentStmt = database.prepare('SELECT * FROM agents WHERE id = ?');
const listAgentsStmt = database.prepare('SELECT * FROM agents ORDER BY created_at ASC');
const deleteAgentStmt = database.prepare('DELETE FROM agents WHERE id = ?');

function computeAgentStats(agent) {
  const completed = countCompletedTasksStmt.get(agent.id, 'completed');
  const memoryItems = countMemoryStmt.get(agent.id);
  return {
    ...agent,
    tasksCompleted: Number(completed?.count ?? 0),
    memoryItems: Number(memoryItems?.count ?? 0),
  };
}

function listAgents() {
  return listAgentsStmt.all().map((row) => computeAgentStats(mapAgentRow(row)));
}

function getAgent(id) {
  const row = getAgentStmt.get(id);
  if (!row) return null;
  return computeAgentStats(mapAgentRow(row));
}

function createAgent({ name, description = '', status = 'inactive' }) {
  if (!name) {
    throw new Error('Name is required');
  }
  if (!ALLOWED_AGENT_STATUSES.has(status)) {
    throw new Error('Invalid status');
  }
  const id = randomUUID();
  const now = nowIso();
  database
    .prepare(
      `INSERT INTO agents (id, name, description, status, last_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, name, description, status, now, now, now);
  return getAgent(id);
}

function updateAgent(id, data) {
  const fields = [];
  const values = [];
  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.status !== undefined) {
    if (!ALLOWED_AGENT_STATUSES.has(data.status)) {
      throw new Error('Invalid status');
    }
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.lastActive !== undefined) {
    fields.push('last_active = ?');
    values.push(data.lastActive);
  }
  if (fields.length === 0) {
    return getAgent(id);
  }
  fields.push('updated_at = ?');
  values.push(nowIso());
  values.push(id);
  const stmt = database.prepare(
    `UPDATE agents SET ${fields.join(', ')} WHERE id = ?`
  );
  const result = stmt.run(...values);
  if (result.changes === 0) return null;
  return getAgent(id);
}

function deleteAgent(id) {
  const result = deleteAgentStmt.run(id);
  return result.changes > 0;
}

function touchAgent(id) {
  return updateAgent(id, { lastActive: nowIso() });
}

const listTasksStmt = database.prepare(
  'SELECT * FROM tasks WHERE agent_id = ? ORDER BY created_at DESC'
);
const getTaskStmt = database.prepare('SELECT * FROM tasks WHERE id = ?');
const deleteTaskStmt = database.prepare('DELETE FROM tasks WHERE id = ?');

function listTasks(agentId) {
  return listTasksStmt.all(agentId).map(mapTaskRow);
}

function getTask(id) {
  const row = getTaskStmt.get(id);
  return row ? mapTaskRow(row) : null;
}

function createTask(agentId, { title, status = 'pending', log = '' }) {
  if (!title) {
    throw new Error('Title is required');
  }
  if (!ALLOWED_TASK_STATUSES.has(status)) {
    throw new Error('Invalid status');
  }
  const id = randomUUID();
  const now = nowIso();
  database
    .prepare(
      `INSERT INTO tasks (id, agent_id, title, status, log, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, agentId, title, status, log, now, now);
  return getTask(id);
}

function updateTask(id, data) {
  const fields = [];
  const values = [];
  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.status !== undefined) {
    if (!ALLOWED_TASK_STATUSES.has(data.status)) {
      throw new Error('Invalid status');
    }
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.log !== undefined) {
    fields.push('log = ?');
    values.push(data.log);
  }
  if (fields.length === 0) {
    return getTask(id);
  }
  fields.push('updated_at = ?');
  values.push(nowIso());
  values.push(id);
  const stmt = database.prepare(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`
  );
  const result = stmt.run(...values);
  if (result.changes === 0) return null;
  return getTask(id);
}

function deleteTask(id) {
  const result = deleteTaskStmt.run(id);
  return result.changes > 0;
}

const listMemoryStmt = database.prepare(
  'SELECT * FROM memory WHERE agent_id = ? ORDER BY created_at DESC'
);
const getMemoryStmt = database.prepare('SELECT * FROM memory WHERE id = ?');
const deleteMemoryStmt = database.prepare('DELETE FROM memory WHERE id = ?');

function listMemory(agentId) {
  return listMemoryStmt.all(agentId).map(mapMemoryRow);
}

function getMemory(id) {
  const row = getMemoryStmt.get(id);
  return row ? mapMemoryRow(row) : null;
}

function createMemory(agentId, { key, value, type = 'fact' }) {
  if (!key) {
    throw new Error('Key is required');
  }
  if (!value) {
    throw new Error('Value is required');
  }
  if (!ALLOWED_MEMORY_TYPES.has(type)) {
    throw new Error('Invalid memory type');
  }
  const id = randomUUID();
  const now = nowIso();
  database
    .prepare(
      `INSERT INTO memory (id, agent_id, key, value, type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, agentId, key, value, type, now, now);
  return getMemory(id);
}

function updateMemory(id, data) {
  const fields = [];
  const values = [];
  if (data.key !== undefined) {
    fields.push('key = ?');
    values.push(data.key);
  }
  if (data.value !== undefined) {
    fields.push('value = ?');
    values.push(data.value);
  }
  if (data.type !== undefined) {
    if (!ALLOWED_MEMORY_TYPES.has(data.type)) {
      throw new Error('Invalid memory type');
    }
    fields.push('type = ?');
    values.push(data.type);
  }
  if (fields.length === 0) {
    return getMemory(id);
  }
  fields.push('updated_at = ?');
  values.push(nowIso());
  values.push(id);
  const stmt = database.prepare(
    `UPDATE memory SET ${fields.join(', ')} WHERE id = ?`
  );
  const result = stmt.run(...values);
  if (result.changes === 0) return null;
  return getMemory(id);
}

function deleteMemory(id) {
  const result = deleteMemoryStmt.run(id);
  return result.changes > 0;
}

function resetAll() {
  database.exec('DELETE FROM memory; DELETE FROM tasks; DELETE FROM agents;');
}

export {
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
};
