import React, { useEffect, useState } from 'react';
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

type CreateAgentFormState = {
  name: string;
  description: string;
  status: AgentStatus;
};

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAgentFormState) => Promise<void> | void;
  isSubmitting?: boolean;
}

const INITIAL_FORM_STATE: CreateAgentFormState = {
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
  const [formData, setFormData] = useState<CreateAgentFormState>(INITIAL_FORM_STATE);

  useEffect(() => {
    if (!open) {
      setFormData(INITIAL_FORM_STATE);
    }
  }, [open]);

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setFormData(INITIAL_FORM_STATE);
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      return;
    }

    try {
      await onSubmit({
        ...formData,
        name: trimmedName,
      });
      setFormData(INITIAL_FORM_STATE);
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create agent', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-[480px]',
          isMobile &&
            'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-y-auto rounded-2xl border border-border/50 p-0'
        )}
      >
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Agent</DialogTitle>
          </DialogHeader>

          <div className={cn('space-y-4 py-4', isMobile ? 'px-5' : '')}>
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter agent name..."
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this agent will do..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as AgentStatus })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
