import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { ToastAction } from '@/components/ui/toast';
import { toast } from '@/hooks/use-toast';
import { useWorkflowRuns } from '@/hooks/use-workflow-runs';

const WorkflowRunNotifications = () => {
  const { data: runs } = useWorkflowRuns();
  const navigate = useNavigate();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!runs) {
      return;
    }

    runs.forEach((run) => {
      if (run.status === 'failed') {
        const key = `${run.id}-run-${run.currentAttempt}`;
        if (!seen.current.has(key)) {
          seen.current.add(key);
          const failingStep = run.steps.find((step) => step.status === 'failed' && step.error);
          toast({
            variant: 'destructive',
            title: `${run.workflowName} failed`,
            description: failingStep?.error?.message ?? 'A workflow run has failed.',
            action: (
              <ToastAction altText="View run" onClick={() => navigate(`/workflow-runs/${run.id}`)}>
                View run
              </ToastAction>
            ),
          });
        }
      }

      run.steps.forEach((step) => {
        if (step.status === 'failed' && step.error) {
          const key = `${run.id}-${step.id}-attempt-${step.error.attempt}`;
          if (!seen.current.has(key)) {
            seen.current.add(key);
            toast({
              variant: 'destructive',
              title: `${step.name} failed`,
              description: step.error.message,
              action: (
                <ToastAction altText="Inspect step" onClick={() => navigate(`/workflow-runs/${run.id}`)}>
                  Inspect
                </ToastAction>
              ),
            });
          }
        }
      });
    });
  }, [runs, navigate]);

  return null;
};

export default WorkflowRunNotifications;
