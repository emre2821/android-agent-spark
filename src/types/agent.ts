export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'learning';
  tasksCompleted: number;
  memoryItems: number;
  lastActive: string;
}
