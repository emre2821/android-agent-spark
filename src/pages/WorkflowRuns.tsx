import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, RotateCcw, Ban, Clock, AlertTriangle, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import {
  useWorkflowRuns,
  useRetryWorkflowRun,
  useCancelWorkflowRun,
} from '@/hooks/use-workflow-runs';
import { WorkflowRun, WorkflowRunStatus, WorkflowStepStatus } from '@/types/workflow';
import { cn } from '@/lib/utils';

const runStatusStyles: Record<WorkflowRunStatus, string> = {
  running: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  retrying: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border/60',
};

const stepStatusStyles: Record<WorkflowStepStatus, string> = {
  pending: 'bg-muted text-muted-foreground border-border/60',
  running: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border/60',
};

const statusLabel = (status: WorkflowRunStatus | WorkflowStepStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1);

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return '—';
  try {
    return format(new Date(timestamp), 'PPpp');
  } catch (error) {
    return timestamp;
  }
};

const formatRelative = (timestamp: string | null) => {
  if (!timestamp) return '—';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch (error) {
    return timestamp;
  }
};

const EmptyState = () => (
  <Card className="border-dashed border-border/60 bg-muted/20">
    <CardContent className="py-16 text-center space-y-4">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Clock className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">No workflow runs yet</h2>
        <p className="text-sm text-muted-foreground">
          Trigger a workflow to begin logging run timelines and step-level output.
        </p>
      </div>
    </CardContent>
  </Card>
);

const StepsSection = ({ run }: { run: WorkflowRun }) => (
  <div className="space-y-4">
    {run.steps.map((step) => (
      <Card key={step.id} className="border-border/50">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{step.name}</CardTitle>
            <CardDescription>
              Attempt {step.attempt} of {step.maxAttempts}
            </CardDescription>
          </div>
          <Badge className={cn('border', stepStatusStyles[step.status])}>
            {statusLabel(step.status)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Started</p>
              <p className="text-sm font-medium">{formatTimestamp(step.startedAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
              <p className="text-sm font-medium">{formatTimestamp(step.completedAt)}</p>
            </div>
          </div>

          {step.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Error on attempt {step.error.attempt}
              </div>
              <p className="mt-1 text-destructive/90">{step.error.message}</p>
            </div>
          )}

          {step.retry.nextRetryAt && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-500">
              Next retry {formatRelative(step.retry.nextRetryAt)}
              {step.retry.lastReason && (
                <span className="block text-xs text-amber-600/80 dark:text-amber-500/80">
                  Reason: {step.retry.lastReason}
                </span>
              )}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">Logs</h4>
              <span className="text-xs text-muted-foreground">
                {step.logs.length} entries
              </span>
            </div>
            <ScrollArea className="h-48 rounded-md border border-border/50 bg-muted/40 p-3">
              <div className="space-y-3 text-sm">
                {step.logs.length === 0 && (
                  <p className="py-6 text-center text-muted-foreground">No logs recorded yet.</p>
                )}
                {step.logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded border border-border/50 bg-background/80 p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatTimestamp(log.timestamp)}</span>
                      <span className="uppercase tracking-wide">{log.level}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                      {log.message}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const TimelineSection = ({ run }: { run: WorkflowRun }) => (
  <Card className="border-border/60">
    <CardHeader>
      <CardTitle className="text-base">Timeline</CardTitle>
      <CardDescription>Track status transitions and retry events.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {run.history.map((event, index) => (
          <div key={`${event.status}-${event.timestamp}-${index}`} className="flex gap-3">
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  'mt-1 h-3 w-3 rounded-full border border-border/60',
                  event.status === 'failed'
                    ? 'bg-destructive'
                    : event.status === 'completed'
                    ? 'bg-emerald-500'
                    : event.status === 'retrying'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                )}
              />
              {index !== run.history.length - 1 && (
                <div className="flex-1 border-l border-border/40" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={cn('border', runStatusStyles[event.status as WorkflowRunStatus] ?? runStatusStyles.running)}>
                  {statusLabel(event.status as WorkflowRunStatus)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
              {event.note && <p className="text-sm text-foreground/80">{event.note}</p>}
            </div>
          </div>
        ))}

        {run.retryHistory.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-500">
            <p className="font-medium">Retry history</p>
            <ul className="mt-2 space-y-1">
              {run.retryHistory.map((retry, index) => (
                <li key={`${retry.stepId ?? 'run'}-${retry.attempt}-${index}`}>
                  Attempt {retry.attempt}
                  {retry.stepId && ` • Step ${retry.stepId}`}
                  {retry.scheduledAt && ` • Scheduled ${formatRelative(retry.scheduledAt)}`}
                  {retry.reason && ` • ${retry.reason}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const RunSummary = ({ run }: { run: WorkflowRun }) => (
  <Card className="border-border/60">
    <CardHeader className="flex flex-row items-start justify-between gap-4">
      <div className="space-y-1">
        <CardTitle>{run.workflowName}</CardTitle>
        <CardDescription>
          Started {formatRelative(run.startedAt)} • Last updated {formatRelative(run.updatedAt)}
        </CardDescription>
      </div>
      <Badge className={cn('border', runStatusStyles[run.status])}>{statusLabel(run.status)}</Badge>
    </CardHeader>
    <CardContent className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Trigger</p>
        <p className="text-sm font-medium capitalize">{run.trigger}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Current attempt</p>
        <p className="text-sm font-medium">{run.currentAttempt}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Retry policy</p>
        <p className="text-sm font-medium">
          {run.retryPolicy.strategy} • up to {run.retryPolicy.maxAttempts} attempts
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Steps completed</p>
        <p className="text-sm font-medium">
          {run.steps.filter((step) => step.status === 'completed').length} / {run.steps.length}
        </p>
      </div>
    </CardContent>
  </Card>
);

const RunList = ({
  runs,
  selectedRunId,
  onSelect,
}: {
  runs: WorkflowRun[];
  selectedRunId: string | null;
  onSelect: (id: string) => void;
}) => (
  <Card className="border-border/60">
    <CardHeader>
      <CardTitle className="text-base">Workflow runs</CardTitle>
      <CardDescription>Monitor execution attempts and status.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {runs.map((run) => {
        const isActive = selectedRunId === run.id;
        return (
          <button
            key={run.id}
            onClick={() => onSelect(run.id)}
            className={cn(
              'w-full rounded-lg border p-4 text-left transition-colors',
              isActive
                ? 'border-primary/60 bg-primary/10 shadow-sm'
                : 'border-border/60 bg-background hover:bg-muted/40'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{run.workflowName}</span>
                <ChevronRight className={cn('h-4 w-4 transition-transform', isActive ? 'translate-x-0' : 'translate-x-1')} />
              </div>
              <Badge className={cn('border', runStatusStyles[run.status])}>{statusLabel(run.status)}</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Started {formatRelative(run.startedAt)} •
              {' '}
              {run.steps.filter((step) => step.status === 'completed').length} / {run.steps.length} steps completed
            </div>
          </button>
        );
      })}
    </CardContent>
  </Card>
);

const WorkflowRuns = () => {
  const { data: runs, isLoading, error } = useWorkflowRuns();
  const params = useParams<{ runId?: string }>();
  const navigate = useNavigate();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(params.runId ?? null);

  const retryMutation = useRetryWorkflowRun();
  const cancelMutation = useCancelWorkflowRun();

  useEffect(() => {
    if (params.runId && params.runId !== selectedRunId) {
      setSelectedRunId(params.runId);
    }
  }, [params.runId, selectedRunId]);

  useEffect(() => {
    if (!runs || runs.length === 0) {
      return;
    }
    if (!selectedRunId || !runs.some((run) => run.id === selectedRunId)) {
      const fallbackId = params.runId && runs.some((run) => run.id === params.runId)
        ? params.runId
        : runs[0].id;
      setSelectedRunId(fallbackId);
      if (params.runId !== fallbackId) {
        navigate(`/workflow-runs/${fallbackId}`, { replace: true });
      }
    }
  }, [runs, selectedRunId, params.runId, navigate]);

  const selectedRun = useMemo(() => {
    if (!runs || runs.length === 0) {
      return null;
    }
    if (!selectedRunId) {
      return runs[0];
    }
    return runs.find((run) => run.id === selectedRunId) ?? runs[0];
  }, [runs, selectedRunId]);

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    navigate(`/workflow-runs/${runId}`);
  };

  const handleRetry = async () => {
    if (!selectedRun) return;
    try {
      await retryMutation.mutateAsync({ runId: selectedRun.id });
      toast({ title: 'Retry scheduled', description: 'A new attempt has been queued for this run.' });
    } catch (err) {
      toast({ title: 'Retry failed', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    if (!selectedRun) return;
    try {
      await cancelMutation.mutateAsync({ runId: selectedRun.id });
      toast({ title: 'Run cancelled', description: 'This workflow run has been cancelled.' });
    } catch (err) {
      toast({ title: 'Cancellation failed', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const canRetry = selectedRun && ['failed', 'cancelled', 'retrying'].includes(selectedRun.status);
  const canCancel = selectedRun && ['running', 'retrying'].includes(selectedRun.status);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md border-destructive/40 bg-destructive/10">
          <CardContent className="space-y-3 py-10 text-center text-destructive">
            <AlertTriangle className="mx-auto h-8 w-8" />
            <div>
              <p className="font-semibold">Failed to load workflow runs</p>
              <p className="text-sm opacity-80">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Workflow runs</h1>
            <p className="text-muted-foreground">Track execution history and retry behaviour.</p>
          </div>
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Workflow runs</h1>
          <p className="text-muted-foreground">
            View execution timelines, inspect step logs, and control retries.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <RunList runs={runs} selectedRunId={selectedRun?.id ?? null} onSelect={handleSelectRun} />

          {selectedRun ? (
            <div className="space-y-6">
              <RunSummary run={selectedRun} />

              <Card className="border-border/60">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Controls</CardTitle>
                    <CardDescription>Manage retry attempts and cancel inflight runs.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      disabled={!canRetry || retryMutation.isPending}
                    >
                      {retryMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Retry run
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancel}
                      disabled={!canCancel || cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="mr-2 h-4 w-4" />
                      )}
                      Cancel run
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <TimelineSection run={selectedRun} />

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-base">Step details</CardTitle>
                  <CardDescription>Inspect execution output for each step.</CardDescription>
                </CardHeader>
                <CardContent>
                  <StepsSection run={selectedRun} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowRuns;
