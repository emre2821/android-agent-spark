import { describe, it, expect } from 'vitest';

type ChaosPayload = {
  id: string;
  content: string;
};

const mockSendChaos = async (payload: ChaosPayload) => {
  return {
    status: 'ok',
    receivedAt: new Date().toISOString(),
    echo: payload.content,
  };
};

describe('happy-path CHAOS flow', () => {
  it('accepts a CHAOS payload and returns a mocked response', async () => {
    const payload: ChaosPayload = { id: 'demo', content: 'hello-chaos' };
    const response = await mockSendChaos(payload);

    expect(response.status).toBe('ok');
    expect(response.echo).toContain(payload.content);
    expect(response.receivedAt).toBeTypeOf('string');
  });
});
