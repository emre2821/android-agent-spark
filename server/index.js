import express from 'express';
import cors from 'cors';
import { mockAgents } from './mockAgents.js';

const app = express();
app.use(cors());
app.use(express.json());

let agents = [...mockAgents];

app.get('/agents', (req, res) => {
  res.json(agents);
});

app.post('/agents/sync', (req, res) => {
  const { agents: incomingAgents, timestamp } = req.body ?? {};

  if (!Array.isArray(incomingAgents)) {
    return res.status(400).json({ message: 'Invalid agent payload' });
  }

  agents = incomingAgents;
  const syncedAt = timestamp || new Date().toISOString();

  res.json({ status: 'ok', syncedAt, total: agents.length });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
