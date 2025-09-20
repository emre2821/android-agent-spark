export interface WorkflowStep {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
}

export interface StoredWorkflow {
  id: string
  name: string
  description: string
  trigger: string
  steps: WorkflowStep[]
  createdAt: string
}
