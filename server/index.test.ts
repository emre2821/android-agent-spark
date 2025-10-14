import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './index.js';

const app = createApp();

describe('Agents API', () => {
  it('returns the full agent collection', async () => {
    const response = await request(app).get('/agents');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('returns agent records with the expected shape', async () => {
    const response = await request(app).get('/agents');
    const agent = response.body[0];

    expect(agent).toHaveProperty('id');
    expect(agent).toHaveProperty('name');
    expect(agent).toHaveProperty('description');
    expect(agent).toHaveProperty('status');
    expect(agent).toHaveProperty('tasksCompleted');
    expect(agent).toHaveProperty('memoryItems');
    expect(agent).toHaveProperty('lastActive');
  });
});
