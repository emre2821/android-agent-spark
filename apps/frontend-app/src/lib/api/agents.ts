import { Agent, AgentStatus } from '@/types/agent';

import { buildApiUrl } from './config';
import { fetchJson } from './fetch';

export const listAgents = () => fetchJson<Agent[]>(buildApiUrl('/agents'));

export const createAgent = (input: {
  name: string;
  description?: string;
  status?: AgentStatus;
}) =>
  fetchJson<Agent>(buildApiUrl('/agents'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

export const updateAgent = (
  agentId: string,
  input: Partial<{ name: string; description: string; status: AgentStatus }>
) =>
  fetchJson<Agent>(buildApiUrl(`/agents/${agentId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

export const deleteAgent = (agentId: string) =>
  fetchJson<void>(buildApiUrl(`/agents/${agentId}`), {
    method: 'DELETE',
  });
