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
import { formatDistanceToNow } from 'date-fns';
import { useWorkflows } from '@/hooks/use-workflows';
import { useToast } from '@/hooks/use-toast';
import { Copy, Loader2, Play, Trash2, Workflow as WorkflowIcon, Plus, Pencil } from 'lucide-react';

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
}

const buildSearchSuffix = (options?: { workflowId?: string; mode?: string }) => {
  const params = new URLSearchParams();
  if (options?.workflowId) {
    params.set('workflowId', options.workflowId);
  }
  if (options?.mode) {
    params.set('mode', options.mode);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const WorkflowDialog: React.FC<WorkflowDialogProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const {
    workflows,
    isLoading,
    publishWorkflow,
    duplicateWorkflow,
    deleteWorkflow,
    isPublishing,
    isDuplicating,
    isDeleting,
  } = useWorkflows();
  const { toast } = useToast();

  const handleOpenBuilder = (options?: { workflowId?: string; mode?: string }) => {
    onClose();
    navigate(`/workflows/builder${buildSearchSuffix(options)}`);
  };

  const handlePublish = async (workflowId: string) => {
    try {
      await publishWorkflow(workflowId);
      toast({
        title: 'Workflow published',
        description: 'The workflow is now available for execution.',
      });
    } catch (error) {
      toast({
        title: 'Unable to publish workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (workflowId: string) => {
    try {
      await duplicateWorkflow(workflowId);
      toast({
        title: 'Workflow duplicated',
        description: 'A draft copy has been created.',
      });
    } catch (error) {
      toast({
        title: 'Unable to duplicate workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (workflowId: string) => {
    try {
      await deleteWorkflow(workflowId);
      toast({
        title: 'Workflow deleted',
        description: 'The workflow has been removed from your library.',
      });
    } catch (error) {
      toast({
        title: 'Unable to delete workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WorkflowIcon className="h-5 w-5" />
            Workflow Library
          </DialogTitle>
          <DialogDescription>
            Review automations and launch the builder to iterate on them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" onClick={() => handleOpenBuilder({ mode: 'new' })}>
            <Plus className="mr-2 h-4 w-4" />
            New workflow
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleOpenBuilder()}>
            <Pencil className="mr-2 h-4 w-4" />
            Open builder
          </Button>
        </div>

        <Separator />

        <ScrollArea className="h-[360px] pr-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <p>No workflows yet.</p>
              <Button size="sm" onClick={() => handleOpenBuilder({ mode: 'new' })}>
                Create your first workflow
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardHeader className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {workflow.name}
                        </CardTitle>
                        {workflow.description && (
                          <CardDescription>{workflow.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={workflow.status === 'published' ? 'default' : 'outline'}>
                        {workflow.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>v{workflow.version}</span>
                      <span>•</span>
                      <span>
                        Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                      </span>
                      {workflow.execution.schedule && (
                        <>
                          <span>•</span>
                          <span>Schedule: {workflow.execution.schedule}</span>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {workflow.metadata.tags.map((tag) => (
                        <Badge key={`${workflow.id}-${tag}`} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenBuilder({ workflowId: workflow.id })}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublish(workflow.id)}
                        disabled={isPublishing}
                      >
                        {isPublishing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(workflow.id)}
                        disabled={isDuplicating}
                      >
                        {isDuplicating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(workflow.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
