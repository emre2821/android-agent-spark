export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'learning';
  tasksCompleted: number;
  memoryItems: number;
  lastActive: string;
  activeLocks?: Record<string, string>;
  collaborators?: string[];
}
