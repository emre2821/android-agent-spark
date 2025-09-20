import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types/agent';

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (agentData: CreateAgentFormValues) => void;
}

type AgentStatus = Agent['status'];

export interface CreateAgentFormValues {
  name: string;
  description: string;
  status: AgentStatus;
}

export const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({ open, onClose, onSubmit }) => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<CreateAgentFormValues>({
    name: '',
    description: '',
    status: 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onSubmit(formData);
    setFormData({ name: '', description: '', status: 'active' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-md', isMobile && 'max-w-[calc(100vw-2rem)] p-4')}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Agent</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as AgentStatus })
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

          <DialogFooter className={cn('gap-2', isMobile && 'space-y-2 sm:space-y-0')}>
            <Button type="button" variant="outline" onClick={onClose} className={cn(isMobile && 'w-full justify-center')}>
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn('bg-gradient-primary', isMobile && 'w-full justify-center')}
            >
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};