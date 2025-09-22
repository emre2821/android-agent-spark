import express from 'express';
import cors from 'cors';
import { mockAgents } from './mockAgents.js';
import {
  createCredential,
  listCredentials,
  deleteCredential,
  accessCredential,
} from './credentialStore.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/agents', (req, res) => {
  res.json(mockAgents);
});

app.get('/api/credentials', (req, res) => {
  const { userId, workspaceId } = req.query;
  if (!userId || !workspaceId) {
    res.status(400).json({ message: 'userId and workspaceId are required' });
    return;
  }
  const credentials = listCredentials({ userId, workspaceId });
  res.json(credentials);
});

app.post('/api/credentials', (req, res) => {
  const { userId, workspaceId, name, type, scopes, secret } = req.body;
  if (!userId || !workspaceId || !name || !type || !secret) {
    res.status(400).json({ message: 'userId, workspaceId, name, type, and secret are required' });
    return;
  }

  try {
    const payload = typeof secret === 'string' ? { token: secret } : secret;
    const created = createCredential({
      userId,
      workspaceId,
      name,
      type,
      scopes: Array.isArray(scopes) ? scopes : [],
      payload,
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Failed to store credential', error: error.message });
  }
});

app.delete('/api/credentials/:id', (req, res) => {
  const { userId, workspaceId } = req.query;
  const { id } = req.params;
  if (!userId || !workspaceId) {
    res.status(400).json({ message: 'userId and workspaceId are required' });
    return;
  }

  const deleted = deleteCredential({ id, userId, workspaceId });
  if (!deleted) {
    res.status(404).json({ message: 'Credential not found' });
    return;
  }

  res.status(204).send();
});

app.post('/api/credentials/:id/access', async (req, res) => {
  const { userId, workspaceId } = req.body;
  const { id } = req.params;
  if (!userId || !workspaceId) {
    res.status(400).json({ message: 'userId and workspaceId are required' });
    return;
  }

  const secret = await accessCredential({ id, userId, workspaceId });
  if (!secret) {
    res.status(404).json({ message: 'Credential not found' });
    return;
  }

  res.json({ secret });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});

