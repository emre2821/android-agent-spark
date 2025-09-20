export type AgentStatus = 'active' | 'inactive' | 'learning'

export interface Agent {
  id: string
  name: string
  description: string
  status: AgentStatus
  tasksCompleted: number
  memoryItems: number
  lastActive: string
}

export type AgentDraft = Pick<Agent, 'name' | 'description' | 'status'>
