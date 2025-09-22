import { useCallback, useEffect, useState } from 'react'
import type { StoredWorkflow } from '@/types/workflow'
import { getCachedWorkflows, persistWorkflows } from '@/lib/offline-storage'

interface WorkflowCache {
  workflows: StoredWorkflow[]
  addWorkflow: (workflow: StoredWorkflow) => void
  removeWorkflow: (workflowId: string) => void
}

export const useWorkflowCache = (): WorkflowCache => {
  const [workflows, setWorkflows] = useState<StoredWorkflow[]>([])

  useEffect(() => {
    let mounted = true
    getCachedWorkflows().then((cached) => {
      if (mounted && cached) {
        setWorkflows(cached)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const addWorkflow = useCallback(
    (workflow: StoredWorkflow) => {
      setWorkflows((previous) => {
        const next = [workflow, ...previous]
        void persistWorkflows(next)
        return next
      })
    },
    []
  )

  const removeWorkflow = useCallback(
    (workflowId: string) => {
      setWorkflows((previous) => {
        const next = previous.filter((workflow) => workflow.id !== workflowId)
        void persistWorkflows(next)
        return next
      })
    },
    []
  )

  return { workflows, addWorkflow, removeWorkflow }
}
