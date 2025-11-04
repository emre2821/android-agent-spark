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

    const runtimeModule = await import('./agentRuntime.js');
    const workspaceModule = await import('./workspaceServer.js');

    const runtimeSpy = vi.spyOn(runtimeModule, 'startAgentRuntime').mockImplementation(() => ({} as any));
    const workspaceSpy = vi.spyOn(workspaceModule, 'startWorkspaceServer').mockImplementation(() => ({} as any));

    await import('./index.js');

    expect(runtimeSpy).toHaveBeenCalledTimes(1);
    expect(workspaceSpy).not.toHaveBeenCalled();
  });

  it('only starts the workspace API when requested', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SERVER_ENTRY = 'workspace';

    const runtimeModule = await import('./agentRuntime.js');
    const workspaceModule = await import('./workspaceServer.js');

    const runtimeSpy = vi.spyOn(runtimeModule, 'startAgentRuntime').mockImplementation(() => ({} as any));
    const workspaceSpy = vi.spyOn(workspaceModule, 'startWorkspaceServer').mockImplementation(() => ({} as any));

    await import('./index.js');

    expect(workspaceSpy).toHaveBeenCalledTimes(1);
    expect(runtimeSpy).not.toHaveBeenCalled();
  });
});
