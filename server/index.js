import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockAgents } from './mockAgents.js';
import { CollaborationEngine } from './collaboration-engine.js';

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const auditLogPath = path.join(__dirname, 'audit-log.json');

const loadAuditLog = async () => {
  try {
    const raw = await fs.readFile(auditLogPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(auditLogPath, JSON.stringify([], null, 2));
      return [];
    }
    throw err;
  }
};

const persistAuditLog = async (log) => {
  await fs.writeFile(auditLogPath, JSON.stringify(log, null, 2));
};

const initialAuditLog = await loadAuditLog();

const engine = new CollaborationEngine({
  initialAuditLog,
  onAuditEntry: async (_entry, log) => {
    try {
      await persistAuditLog(log);
      broadcastAudit(_entry);
    } catch (err) {
      console.error('Failed to persist audit log', err);
    }
  },
});

const clients = new Map();

const server = createServer(app);
const wss = new WebSocketServer({ server });

const send = (socket, payload) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const broadcast = (resource, payload, excludeSocket) => {
  const message = JSON.stringify(payload);
  for (const [socket, state] of clients.entries()) {
    if (socket === excludeSocket) continue;
    if (state.resources.has(resource) && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
};

const broadcastPresence = (resource, presence, excludeSocket) => {
  broadcast(resource, { type: 'presence-update', resource, users: presence }, excludeSocket);
};

const broadcastLock = (resource, lock, excludeSocket) => {
  broadcast(resource, { type: 'lock-update', resource, lock }, excludeSocket);
};

const broadcastAudit = (entry) => {
  const message = JSON.stringify({ type: 'audit-entry', entry });
  for (const socket of clients.keys()) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
};

const handleJoin = (socket, state, message) => {
  const { resource, userId, userName, color } = message;
  try {
    const { presence, lock } = engine.join(resource, { id: userId, name: userName, color });
    state.userId = userId;
    state.userName = userName;
    state.resources.add(resource);
    send(socket, { type: 'presence-update', resource, users: presence });
    send(socket, { type: 'lock-update', resource, lock });
    broadcastPresence(resource, presence, socket);
  } catch (err) {
    send(socket, { type: 'error', message: err.message });
  }
};

const sendConflict = (socket, { ackId, resource, message, lock }) => {
  send(socket, {
    type: 'conflict',
    ackId,
    resource,
    message,
    lock,
  });
};

const sendAck = (socket, { ackId, resource, status, lock }) => {
  send(socket, {
    type: 'ack',
    ackId,
    resource,
    status,
    lock,
  });
};

const handleLock = (socket, state, message) => {
  const { resource, userId, userName, ackId, metadata } = message;
  const result = engine.acquireLock(resource, { id: userId, name: userName }, metadata);
  if (result.success) {
    broadcastLock(resource, result.lock);
    sendAck(socket, { ackId, resource, status: 'locked', lock: result.lock });
  } else {
    sendConflict(socket, {
      ackId,
      resource,
      message: 'Resource is locked by another user',
      lock: result.conflict,
    });
  }
};

const handleUnlock = (socket, message) => {
  const { resource, userId, ackId, metadata } = message;
  const result = engine.releaseLock(resource, userId, metadata);
  if (result.success) {
    broadcastLock(resource, null);
    sendAck(socket, { ackId, resource, status: 'unlocked', lock: null });
  } else {
    sendConflict(socket, {
      ackId,
      resource,
      message: 'Unable to release lock',
      lock: result.lock,
    });
  }
};

const handleForceUnlock = (socket, state, message) => {
  const { resource, userId, userName, ackId, metadata } = message;
  const result = engine.forceUnlock(resource, { id: userId, name: userName }, metadata);
  broadcastLock(resource, result.lock);
  sendAck(socket, { ackId, resource, status: 'force-unlocked', lock: result.lock });
};

const handleSave = (socket, message) => {
  const { resource, userId, userName, summary, metadata, ackId } = message;
  const result = engine.save(resource, { id: userId, name: userName }, summary, metadata);
  if (result.success) {
    sendAck(socket, { ackId, resource, status: 'saved', lock: engine.getLock(resource) });
  } else {
    sendConflict(socket, {
      ackId,
      resource,
      message: 'Save rejected because you do not hold the lock',
      lock: result.conflict,
    });
  }
};

const handleLeave = (socket, state, message) => {
  const { resource, userId } = message;
  const { presence, lock } = engine.leave(resource, userId);
  state.resources.delete(resource);
  broadcastPresence(resource, presence, socket);
  if (!lock || lock.userId !== userId) {
    return;
  }
  engine.releaseLock(resource, userId, { reason: 'User left channel' });
  broadcastLock(resource, engine.getLock(resource), socket);
};

const handlers = {
  join: handleJoin,
  lock: handleLock,
  unlock: handleUnlock,
  'force-unlock': handleForceUnlock,
  save: handleSave,
  leave: handleLeave,
};

wss.on('connection', (socket) => {
  const state = { resources: new Set(), userId: null, userName: null };
  clients.set(socket, state);

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (err) {
      console.error('Invalid message received', err);
      return;
    }
    const handler = handlers[message.type];
    if (handler) {
      handler(socket, state, message);
    }
  });

  socket.on('close', () => {
    clients.delete(socket);
    if (!state.userId) return;
    const affectedResources = engine.removeUserFromAll(state.userId);
    for (const { resource, presence, lock } of affectedResources) {
      broadcastPresence(resource, presence, socket);
      broadcastLock(resource, lock, socket);
    }
  });
});

app.get('/agents', (req, res) => {
  res.json(mockAgents);
});

app.get('/audit', (req, res) => {
  res.json(engine.getAuditLog(200));
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
