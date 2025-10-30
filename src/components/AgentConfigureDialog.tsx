import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAgents } from '@/hooks/use-agents';
import { cn } from '@/lib/utils';
import type { Agent, AgentStatus } from '@/types/agent';

interface AgentConfigureDialogProps {
  open: boolean;
  onClose: () => void;
  agent: Agent | null;
}

interface FormState {
  name: string;
  description: string;
  status: AgentStatus;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  status: 'active',
};

const deriveFormState = (agent: Agent | null): FormState => {
  if (!agent) {
    return { ...EMPTY_FORM };
  }
  return {
    name: agent.name,
    description: agent.description,
    status: agent.status,
  };
};

export const AgentConfigureDialog: React.FC<AgentConfigureDialogProps> = ({ open, onClose, agent }) => {
  const isMobile = useIsMobile();
  const { updateAgent } = useAgents();
  const [formState, setFormState] = useState<FormState>(deriveFormState(agent));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormState(deriveFormState(agent));
      setIsSaving(false);
    } else {
      setFormState({ ...EMPTY_FORM });
      setIsSaving(false);
    }
  }, [agent, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFormState({ ...EMPTY_FORM });
      setIsSaving(false);
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!agent) return;

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      return;
    }

    const updates: Partial<{ name: string; description: string; status: AgentStatus }> = {};
    if (agent.name !== trimmedName) {
      updates.name = trimmedName;
    }
    if (agent.description !== formState.description) {
      updates.description = formState.description;
    }
    if (agent.status !== formState.status) {
      updates.status = formState.status;
    }

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      await updateAgent(agent.id, updates);
      onClose();
    } catch (error) {
      console.error('Failed to update agent configuration', error);
    } finally {
      setIsSaving(false);
    }
  };

  const statusLabel = useMemo(() => {
    switch (formState.status) {
      case 'inactive':
        return 'Inactive';
      case 'learning':
        return 'Learning';
      default:
        return 'Active';
    }
  }, [formState.status]);

  if (!agent) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-[560px]',
          isMobile &&
            'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-y-auto rounded-2xl border border-border/50 p-0',
        )}
      >
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Configure Agent</DialogTitle>
            <DialogDescription>Update metadata and availability for {agent.name}.</DialogDescription>
          </DialogHeader>

          <div className={cn('space-y-6 py-4', isMobile ? 'px-5' : '')}>
            <div className="space-y-2">
              <Label htmlFor="configure-agent-name">Agent Name</Label>
              <Input
                id="configure-agent-name"
                value={formState.name}
                onChange={(event) => setFormState((state) => ({ ...state, name: event.target.value }))}
                placeholder="Agent name"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="configure-agent-description">Description</Label>
              <Textarea
                id="configure-agent-description"
                value={formState.description}
                onChange={(event) => setFormState((state) => ({ ...state, description: event.target.value }))}
                placeholder="Describe what this agent is responsible for"
                rows={4}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="configure-agent-status">Status</Label>
              <Select
                value={formState.status}
                onValueChange={(value) => setFormState((state) => ({ ...state, status: value as AgentStatus }))}
                disabled={isSaving}
              >
                <SelectTrigger id="configure-agent-status" aria-label="Status">
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !formState.name.trim()}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
