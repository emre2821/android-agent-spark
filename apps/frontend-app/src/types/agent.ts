export type AgentStatus = 'active' | 'inactive' | 'learning';

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
  tasksCompleted: number;
  memoryItems: number;
}
