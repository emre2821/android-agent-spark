export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'learning';
  tasksCompleted: number;
  memoryItems: number;
  lastActive: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemory {
  id: string;
  agentId: string;
  key: string;
  value: string;
  type: 'fact' | 'preference' | 'skill' | 'context';
  timestamp: string;
}
