export type MemoryType = 'fact' | 'preference' | 'skill' | 'context';

export interface MemoryItem {
  id: string;
  agentId: string;
  key: string;
  value: string;
  type: MemoryType;
  createdAt: string;
  updatedAt: string;
}
