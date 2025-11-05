import http from 'http';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    process.env.NODE_ENV = 'development';
    process.env.PORT = '0';

    const listenSpy = vi.spyOn(http.Server.prototype, 'listen');

    importedModule = await import('./index.js');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(listenSpy).toHaveBeenCalledTimes(1);
    expect(importedModule.server?.listening).toBe(true);
  });
});

describe('entrypoint bootstrap', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('only starts the runtime server when configured', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SERVER_ENTRY = 'runtime';
    process.env.PORT = '0';

    const workspaceModule = await import('./workspaceServer.js');
    const workspaceSpy = vi
      .spyOn(workspaceModule, 'startWorkspaceServer')
      .mockImplementation(() => ({} as any));

    const indexModule = await import('./index.js');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(indexModule.server?.listening).toBe(true);
    expect(workspaceSpy).not.toHaveBeenCalled();
    await indexModule.stopServer();
  });

  it('only starts the workspace API when requested', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SERVER_ENTRY = 'workspace';

    const workspaceModule = await import('./workspaceServer.js');
    const runtimeModule = await import('./agentRuntime.js');

    const workspaceSpy = vi
      .spyOn(workspaceModule, 'startWorkspaceServer')
      .mockImplementation(() => ({} as any));
    const runtimeSpy = vi.spyOn(runtimeModule, 'startAgentRuntime').mockImplementation(() => ({} as any));

    await import('./index.js');

    expect(workspaceSpy).toHaveBeenCalledTimes(1);
    expect(runtimeSpy).not.toHaveBeenCalled();
  });
});
