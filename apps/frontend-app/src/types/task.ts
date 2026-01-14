export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Task {
  id: string;
  agentId: string;
  title: string;
  status: TaskStatus;
  log: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStreamEvent {
  taskId: string;
  agentId: string;
  message: string;
  timestamp: string;
  step: number;
}
