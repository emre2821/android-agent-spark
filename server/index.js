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

});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
