import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { AgentDraft, AgentStatus } from '@/types/agent';

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (agentData: AgentDraft) => void;
}

export const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<AgentDraft>({
    name: '',
    description: '',
    status: 'active'
  });
  const isMobile = useIsMobile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onSubmit(formData);
    setFormData({ name: '', description: '', status: 'active' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'sm:max-w-md',
          isMobile &&
            'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-y-auto rounded-2xl border border-border/50 p-0'
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Agent</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className={cn('space-y-4', isMobile ? 'p-5 pb-6' : '')}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter agent name..."
              required
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
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Initial Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: AgentStatus) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className={cn('flex gap-2', isMobile && 'flex-col-reverse gap-3 pt-2')}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={cn(isMobile && 'w-full text-base')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn('bg-gradient-primary', isMobile && 'w-full text-base')}
            >
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};