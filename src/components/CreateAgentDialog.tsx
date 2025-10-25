import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types/agent';

export interface CreateAgentFormValues {
import type { AgentStatus } from '@/hooks/use-agents';
import type { AgentStatus } from '@/types/agent';


export interface CreateAgentFormValues {
  name: string;
  description: string;
  status: AgentStatus;
}

type AgentStatus = 'active' | 'inactive' | 'learning';

interface CreateAgentPayload {
  name: string;
  description: string;
  status: AgentStatus;
}

type AgentStatus = 'active' | 'inactive' | 'learning';

interface CreateAgentPayload {
  name: string;
  description: string;
  status: AgentStatus;
}

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateAgentFormValues) => Promise<void> | void;
  isSubmitting: boolean;
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
  isSubmitting,
}) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<CreateAgentFormValues>(() => ({ ...DEFAULT_FORM_STATE }));

  useEffect(() => {
    if (!open) {
      setFormData({ ...DEFAULT_FORM_STATE });
    }
  }, [open]);

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim() || isSubmitting) return;

    const payload: CreateAgentFormValues = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      status: formData.status,
    };

    try {
      await onSubmit(payload);
      onClose();
      setFormData({ ...DEFAULT_FORM_STATE });
    } catch (error) {
  onSubmit: (agentData: CreateAgentPayload) => void;
}

export const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateAgentPayload>({
    name: '',
    description: '',
    status: 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onSubmit(formData);
    setFormData({ name: '', description: '', status: 'active' });
  onSubmit: (values: CreateAgentFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

const defaultForm: CreateAgentFormValues = {
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
  const [formData, setFormData] = useState<CreateAgentFormValues>(defaultForm);
  const isMobile = useIsMobile();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      return;
    }

    try {
      await onSubmit(formData);
      setFormData(defaultForm);
    } catch (error) {
      // Leave the form populated so the user can retry if submission failed.

      console.error('Failed to create agent', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        className={cn(
          'sm:max-w-[500px]',
          isMobile &&
            'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-y-auto rounded-2xl border border-border/50'
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Agent</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
                onValueChange={(value) => setFormData({ ...formData, status: value as AgentStatus })}
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

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-lg', isMobile && 'max-h-[95vh] overflow-y-auto')}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Agent</DialogTitle>
            <DialogDescription>
              Define the purpose and readiness of the agent before it joins your workspace.
            </DialogDescription>
          </DialogHeader>

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
            <Label htmlFor="status">Initial Status</Label>
            <Label htmlFor="agent-status">Initial Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: AgentStatus) =>
                setFormData({ ...formData, status: value })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="agent-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>

                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">

              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

