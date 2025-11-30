import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types/agent';

export interface CreateAgentFormValues {
  name: string;
  description: string;
  status: AgentStatus;
}

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateAgentFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}

const DEFAULT_FORM_STATE: CreateAgentFormValues = {
  name: '',
  description: '',
  status: 'active',
};

export const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<CreateAgentFormValues>(DEFAULT_FORM_STATE);

  useEffect(() => {
    if (!open) {
      setFormData(DEFAULT_FORM_STATE);
    }
  }, [open]);

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFormData(DEFAULT_FORM_STATE);
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName || isSubmitting) {
      return;
    }

    const payload: CreateAgentFormValues = {
      name: trimmedName,
      description: formData.description.trim(),
      status: formData.status,
    };

    try {
      await onSubmit(payload);
      setFormData(DEFAULT_FORM_STATE);
      onClose();
    } catch (error) {
      console.error('Failed to create agent', error);
    }
  };

  const statusLabel = useMemo(() => {
    switch (formData.status) {
      case 'inactive':
        return 'Inactive';
      case 'learning':
        return 'Learning';
      default:
        return 'Active';
    }
  }, [formData.status]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        className={cn(
          'sm:max-w-[480px]',
          isMobile &&
            'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-y-auto rounded-2xl border border-border/50 p-0',
        )}
      >
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Agent</DialogTitle>
          </DialogHeader>

          <div className={cn('space-y-4 py-4', isMobile ? 'px-5' : '')}>
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="Enter agent name..."
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-description">Description</Label>
              <Textarea
                id="agent-description"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                placeholder="Describe what this agent will do..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-status">Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as AgentStatus })}
                disabled={isSubmitting}
              >
                <SelectTrigger id="agent-status" aria-label="Status">
                  <SelectValue placeholder="Select status">{statusLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? 'Creating…' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
