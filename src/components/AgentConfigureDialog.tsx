import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, X, Plus, Workflow } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { Agent, AgentDraft, AgentStatus } from '@/types/agent';

interface AgentConfigureDialogProps {
  open: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSave: (agentId: string, config: AgentDraft) => void;
}

type AgentPriority = 'low' | 'medium' | 'high' | 'critical'

interface AgentConfiguration {
  name: string
  description: string
  status: AgentStatus
  autoStart: boolean
  learningMode: boolean
  maxTasks: number
  priority: AgentPriority
  tags: string[]
  systemPrompt: string
  memoryLimit: number
}

export const AgentConfigureDialog: React.FC<AgentConfigureDialogProps> = ({
  open,
  onClose,
  agent,
  onSave,
}) => {
  const [config, setConfig] = useState<AgentConfiguration>({
    name: agent?.name || '',
    description: agent?.description || '',
    status: agent?.status || 'inactive',
    autoStart: true,
    learningMode: true,
    maxTasks: 100,
    priority: 'medium',
    tags: ['automation', 'ai'],
    systemPrompt: 'You are a helpful AI agent designed to automate tasks efficiently.',
    memoryLimit: 1000,
  });

  const [newTag, setNewTag] = useState('');
  const isMobile = useIsMobile();

  const handleSave = () => {
    if (!agent) return;
    const payload: AgentDraft = {
      name: config.name,
      description: config.description,
      status: config.status,
    };
    onSave(agent.id, payload);
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !config.tags.includes(newTag.trim())) {
      setConfig({
        ...config,
        tags: [...config.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setConfig({
      ...config,
      tags: config.tags.filter(tag => tag !== tagToRemove),
    });
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'sm:max-w-[600px] max-h-[80vh] overflow-y-auto',
          isMobile &&
            'h-[calc(100vh-2rem)] max-h-none w-[calc(100vw-2rem)] max-w-none overflow-y-auto rounded-2xl border border-border/50 p-0'
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Agent: {agent.name}
          </DialogTitle>
          <DialogDescription>
            Customize your agent's behavior, settings, and workflows.
          </DialogDescription>
        </DialogHeader>

        <div className={cn('space-y-6 py-4', isMobile ? 'px-5' : '')}>
          {/* Basic Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Basic Information</h4>
            
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input
                id="agentName"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Enter agent name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agentDescription">Description</Label>
              <Textarea
                id="agentDescription"
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Describe what this agent does"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={config.status}
                  onValueChange={(value: AgentStatus) => setConfig({ ...config, status: value })}
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

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={config.priority}
                  onValueChange={(value: AgentPriority) => setConfig({ ...config, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Behavior Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Behavior</h4>
            
            <div
              className={cn(
                'flex items-center justify-between',
                isMobile && 'flex-col items-start gap-2 rounded-xl border border-border/60 p-3'
              )}
            >
              <div className="space-y-0.5">
                <Label className="text-sm">Auto-start on system boot</Label>
                <p className="text-xs text-muted-foreground">
                  Agent will start automatically when system starts
                </p>
              </div>
              <Switch
                checked={config.autoStart}
                onCheckedChange={(checked) => setConfig({ ...config, autoStart: checked })}
              />
            </div>

            <div
              className={cn(
                'flex items-center justify-between',
                isMobile && 'flex-col items-start gap-2 rounded-xl border border-border/60 p-3'
              )}
            >
              <div className="space-y-0.5">
                <Label className="text-sm">Learning mode</Label>
                <p className="text-xs text-muted-foreground">
                  Allow agent to learn from interactions
                </p>
              </div>
              <Switch
                checked={config.learningMode}
                onCheckedChange={(checked) => setConfig({ ...config, learningMode: checked })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxTasks">Max concurrent tasks</Label>
                <Input
                  id="maxTasks"
                  type="number"
                  min="1"
                  max="1000"
                  value={config.maxTasks}
                  onChange={(e) => setConfig({ ...config, maxTasks: parseInt(e.target.value) || 100 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="memoryLimit">Memory limit (items)</Label>
                <Input
                  id="memoryLimit"
                  type="number"
                  min="100"
                  max="10000"
                  value={config.memoryLimit}
                  onChange={(e) => setConfig({ ...config, memoryLimit: parseInt(e.target.value) || 1000 })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Tags</h4>
            
            <div className="flex flex-wrap gap-2">
              {config.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>

            <div className={cn('flex gap-2', isMobile && 'flex-col gap-3')}>
              <Input
                placeholder="Add new tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
              />
              <Button size={isMobile ? 'default' : 'sm'} onClick={addTag} className={cn(isMobile && 'w-full text-base')}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* System Prompt */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">System Prompt</h4>
            <Textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              placeholder="Define the agent's role and behavior"
              rows={4}
            />
          </div>

          <Separator />

          {/* Workflows */}
          <div className="space-y-4">
            <div
              className={cn(
                'flex items-center justify-between',
                isMobile && 'flex-col items-start gap-3 rounded-xl border border-border/60 p-3'
              )}
            >
              <h4 className="text-sm font-medium text-foreground">Workflows</h4>
              <Button
                variant="outline"
                size={isMobile ? 'default' : 'sm'}
                className={cn(isMobile && 'w-full justify-center text-base')}
              >
                <Workflow className="h-4 w-4 mr-2" />
                Manage Workflows
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No workflows configured for this agent. Click "Manage Workflows" to add automation workflows.
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex justify-end gap-2',
            isMobile && 'flex-col-reverse gap-3 px-5 pb-5'
          )}
        >
          <Button
            variant="outline"
            onClick={onClose}
            className={cn(isMobile && 'w-full text-base')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className={cn(isMobile && 'w-full text-base')}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};