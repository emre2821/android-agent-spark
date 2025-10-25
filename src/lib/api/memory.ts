import { MemoryItem, MemoryType } from '@/types/memory';

import { buildApiUrl } from './config';
import { fetchJson } from './fetch';

export const listMemory = (agentId: string) =>
  fetchJson<MemoryItem[]>(buildApiUrl(`/agents/${agentId}/memory`));

export const createMemory = (
  agentId: string,
  input: { key: string; value: string; type: MemoryType }
) =>
  fetchJson<MemoryItem>(buildApiUrl(`/agents/${agentId}/memory`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

export const updateMemory = (
  memoryId: string,
  input: Partial<{ key: string; value: string; type: MemoryType }>
) =>
  fetchJson<MemoryItem>(buildApiUrl(`/memory/${memoryId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

export const deleteMemory = (memoryId: string) =>
  fetchJson<void>(buildApiUrl(`/memory/${memoryId}`), {
    method: 'DELETE',
  });
