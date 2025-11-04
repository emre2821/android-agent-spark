import http from 'http';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('module startup', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPort = process.env.PORT;
  let importedModule: typeof import('./index.js') | undefined;

  afterEach(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
    if (importedModule?.stopServer) {
      await importedModule.stopServer();
    }
    importedModule = undefined;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('binds the runtime listener only once when auto-starting', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'development';
    process.env.PORT = '0';

    const listenSpy = vi.spyOn(http.Server.prototype, 'listen');

    importedModule = await import('./index.js');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listenSpy).toHaveBeenCalledTimes(1);
    expect(importedModule.server?.listening).toBe(true);
  });
});
