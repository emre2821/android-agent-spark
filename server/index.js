import express from 'express';
import cors from 'cors';
import { mockAgents } from './mockAgents.js';

const app = express();
app.use(cors());

app.get('/agents', (req, res) => {
  res.json(mockAgents);
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
