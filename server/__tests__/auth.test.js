import request from 'supertest';
import { createServer } from '../index.js';

const app = createServer();

const loginAs = async (email) => {
  const response = await request(app)
    .post('/auth/login')
    .send({ email, password: 'password123' });

  if (response.status !== 200) {
    throw new Error(`Failed to login as ${email}: ${response.body?.message}`);
  }

  return response.body.token;
};

describe('workspace isolation', () => {
  it('requires authentication to access workspace-scoped routes', async () => {
    const response = await request(app).get('/workspaces/workspace-aurora/agents');
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/authentication/i);
  });

  it('prevents users from viewing resources in workspaces they do not belong to', async () => {
    const token = await loginAs('casey.editor@example.com');
    const response = await request(app)
      .get('/workspaces/workspace-cobalt/agents')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/do not have access/i);
  });

  it('allows access to agents within an authorized workspace', async () => {
    const token = await loginAs('avery.owner@example.com');
    const response = await request(app)
      .get('/workspaces/workspace-aurora/agents')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.every((agent) => agent.workspaceId === 'workspace-aurora')).toBe(true);
  });

  it('blocks viewer roles from accessing privileged credentials', async () => {
    const token = await loginAs('devon.viewer@example.com');
    const response = await request(app)
      .get('/workspaces/workspace-cobalt/credentials')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/permission/i);
  });

  it('allows editors to view credentials in their workspace', async () => {
    const token = await loginAs('casey.editor@example.com');
    const response = await request(app)
      .get('/workspaces/workspace-aurora/credentials')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.every((cred) => cred.id.startsWith('aurora-cred'))).toBe(true);
  });
});
