import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useWorkflows } from '@/hooks/use-workflows';
import type { Workflow } from '@/types/workflow';
import { CalendarCheck, Copy, Flame, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
}

type WorkflowActions = {
  publishWorkflow?: (workflowId: string) => Promise<void>;
  duplicateWorkflow?: (workflowId: string) => Promise<void>;
  deleteWorkflow?: (workflowId: string) => Promise<void>;
  isPublishing?: boolean;
  isDuplicating?: boolean;
  isDeleting?: boolean;
};

const statusBadgeVariant = (status?: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
    case 'paused':
      return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
    case 'archived':
      return 'bg-slate-500/20 text-slate-200 border-slate-500/40';
    default:
      return 'bg-sky-500/20 text-sky-100 border-sky-500/40';
  }
};

export const WorkflowDialog: React.FC<WorkflowDialogProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const workflowsContext = useWorkflows() as { workflows: Workflow[] } & WorkflowActions;
  const {
    workflows,
    publishWorkflow,
    duplicateWorkflow,
    deleteWorkflow,
    isPublishing,
    isDuplicating,
    isDeleting,
  } = workflowsContext;

  const handleEdit = (workflowId: string) => {
    onClose();
    navigate(`/workflows/builder?workflowId=${workflowId}`);
  };

  const handlePublish = async (workflowId: string) => {
    if (!publishWorkflow) return;
    try {
      await publishWorkflow(workflowId);
      toast({ title: 'Workflow published', description: 'The workflow is now active.' });
    } catch (error) {
      toast({
        title: 'Publish failed',
        description: error instanceof Error ? error.message : 'Unable to publish workflow.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (workflowId: string) => {
    if (!duplicateWorkflow) return;
    try {
      await duplicateWorkflow(workflowId);
      toast({ title: 'Workflow duplicated', description: 'A new draft was created.' });
    } catch (error) {
      toast({
        title: 'Duplicate failed',
        description: error instanceof Error ? error.message : 'Unable to duplicate workflow.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!deleteWorkflow) return;
    try {
      await deleteWorkflow(workflowId);
      toast({ title: 'Workflow deleted', description: 'The workflow has been removed.' });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete workflow.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Workflow Library</DialogTitle>
          <DialogDescription>
            Review, publish, or duplicate existing automation workflows.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[420px] pr-2">
          <div className="space-y-4">
            {workflows.length === 0 && (
              <Card className="border-dashed border-border/60 bg-card/40">
                <CardHeader>
                  <CardTitle className="text-base">No workflows yet</CardTitle>
                  <CardDescription>
                    Create a workflow from the builder to make it appear here.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="border-border/60 bg-card/40">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {workflow.description || 'No description provided.'}
                      </CardDescription>
                    </div>
                    <Badge className={statusBadgeVariant((workflow as any).status)}>
                      {(workflow as any).status ?? 'draft'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4" />
                      Updated {formatRelative(workflow.updatedAt)}
                    </span>
                    <Separator orientation="vertical" className="hidden h-4 sm:inline-block" />
                    <span className="flex items-center gap-2">
                      <Flame className="h-4 w-4" />
                      {(workflow.versions?.length ?? 0) + 1} versions
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(workflow.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePublish(workflow.id)}
                      disabled={Boolean(isPublishing)}
                    >
                      <Flame className="mr-2 h-4 w-4" />
                      {isPublishing ? 'Publishing…' : 'Publish'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicate(workflow.id)}
                      disabled={Boolean(isDuplicating)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {isDuplicating ? 'Duplicating…' : 'Duplicate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(workflow.id)}
                      disabled={Boolean(isDeleting)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const formatRelative = (isoDate: string | undefined) => {
  if (!isoDate) return 'recently';
  try {
    return formatDistanceToNow(new Date(isoDate), { addSuffix: true });
  } catch {
    return 'recently';
  }
};
