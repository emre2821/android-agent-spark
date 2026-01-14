// @vitest-environment node
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import supertest from 'supertest';
import WebSocket from 'ws';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbPath = path.join(__dirname, '../data/test.db');

process.env.NODE_ENV = 'test';
process.env.AGENT_DB_PATH = testDbPath;

if (fs.existsSync(testDbPath)) {
  fs.rmSync(testDbPath);
}

const { createApp } = await import('../index.js');

describe('agent service integration', () => {
  const appContext = createApp();
  const request = supertest(appContext.app);
  let baseUrl = '';
  let port = 0;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      appContext.server.listen(0, () => {
        const address = appContext.server.address();
        if (address && typeof address !== 'string') {
          port = address.port;
          baseUrl = `ws://127.0.0.1:${port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await appContext.close();
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath);
    }
  });

  beforeEach(async () => {
    await request.post('/__test__/reset').expect(204);
  });

  it('performs agent CRUD lifecycle', async () => {
    const createRes = await request
      .post('/agents')
      .send({ name: 'Alpha', description: 'Primary agent', status: 'active' })
      .expect(201);

    expect(createRes.body).toMatchObject({
      name: 'Alpha',
      description: 'Primary agent',
      status: 'active',
      tasksCompleted: 0,
      memoryItems: 0,
    });

    const agentId = createRes.body.id as string;

    const listRes = await request.get('/agents').expect(200);
    expect(listRes.body).toHaveLength(1);

    const updateRes = await request
      .put(`/agents/${agentId}`)
      .send({ description: 'Updated description', status: 'inactive' })
      .expect(200);

    expect(updateRes.body).toMatchObject({
      id: agentId,
      description: 'Updated description',
      status: 'inactive',
    });

    await request.delete(`/agents/${agentId}`).expect(204);

    const listAfterDelete = await request.get('/agents').expect(200);
    expect(listAfterDelete.body).toHaveLength(0);
  });

  it('manages memory items for an agent', async () => {
    const agentRes = await request
      .post('/agents')
      .send({ name: 'MemoryBot', description: 'Keeps track', status: 'learning' })
      .expect(201);
    const agentId = agentRes.body.id as string;

    const createMemory = await request
      .post(`/agents/${agentId}/memory`)
      .send({ key: 'timezone', value: 'UTC', type: 'fact' })
      .expect(201);

    const memoryId = createMemory.body.id as string;

    const listMemory = await request.get(`/agents/${agentId}/memory`).expect(200);
    expect(listMemory.body).toHaveLength(1);

    const updateMemoryRes = await request
      .patch(`/memory/${memoryId}`)
      .send({ value: 'UTC+1', type: 'context' })
      .expect(200);
    expect(updateMemoryRes.body).toMatchObject({ value: 'UTC+1', type: 'context' });

    await request.delete(`/memory/${memoryId}`).expect(204);

    const emptyMemory = await request.get(`/agents/${agentId}/memory`).expect(200);
    expect(emptyMemory.body).toHaveLength(0);
  });

  it('streams task execution updates via websocket', async () => {
    const agentRes = await request
      .post('/agents')
      .send({ name: 'Runner', description: 'Handles tasks', status: 'active' })
      .expect(201);
    const agentId = agentRes.body.id as string;

    const socket = new WebSocket(`${baseUrl}/ws`);
    const received: Array<{ type: string; data?: Record<string, unknown> }> = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 2000);
      socket.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    socket.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        received.push(parsed);
      } catch (error) {
        // ignore malformed
      }
    });

    const taskRes = await request
      .post(`/agents/${agentId}/tasks`)
      .send({ title: 'Example Task' })
      .expect(201);
    const taskId = taskRes.body.id as string;

    await request.post(`/tasks/${taskId}/run`).expect(200);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Task stream timeout')), 5000);
      const check = () => {
        const completed = received.find(
          (event) => event.type === 'task.updated' && event.data?.id === taskId && event.data?.status === 'completed'
        );
        if (completed) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });

    socket.close();

    const streamEvents = received.filter((event) => event.type === 'task.stream' && event.data?.taskId === taskId);
    expect(streamEvents.length).toBeGreaterThan(0);

    const agentsAfter = await request.get('/agents').expect(200);
    expect(agentsAfter.body[0]?.tasksCompleted).toBe(1);
  });
});
