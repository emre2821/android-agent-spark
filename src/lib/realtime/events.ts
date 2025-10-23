import { Agent } from '@/types/agent';
import { MemoryItem } from '@/types/memory';
import { Task, TaskStreamEvent } from '@/types/task';

export type ServerEvent =
  | { type: 'connected' }
  | { type: 'agent.created'; data: Agent }
  | { type: 'agent.updated'; data: Agent }
  | { type: 'agent.deleted'; data: { id: string } }
  | { type: 'task.created'; data: Task }
  | { type: 'task.updated'; data: Task }
  | { type: 'task.deleted'; data: { id: string; agentId: string } }
  | { type: 'task.stream'; data: TaskStreamEvent }
  | { type: 'memory.created'; data: MemoryItem }
  | { type: 'memory.updated'; data: MemoryItem }
  | { type: 'memory.deleted'; data: { id: string; agentId: string } };

export type ServerEventListener = (event: ServerEvent) => void;
