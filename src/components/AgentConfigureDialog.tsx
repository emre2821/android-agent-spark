import React, { useEffect, useMemo, useState } from 'react';
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
import { useAgents } from '@/hooks/use-agents';
import { useToast } from '@/hooks/use-toast';
import type { AgentStatus } from '@/types/agent';

interface AgentConfigureDialogProps {
  open: boolean;
  onClose: () => void;
  agentId: string | null;
}

const DEFAULT_TAGS = ['automation', 'ai'];

export const AgentConfigureDialog: React.FC<AgentConfigureDialogProps> = ({
  open,
  onClose,
  agentId,
}) => {
  const { agents, updateAgent } = useAgents();
  const { toast } = useToast();
  const agent = useMemo(() => agents.find((item) => item.id === agentId) ?? null, [agents, agentId]);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    name: '',
    description: '',
    status: 'inactive' as AgentStatus,
    autoStart: true,
    learningMode: true,
    maxTasks: 100,
    priority: 'medium',
    tags: [...DEFAULT_TAGS],
    systemPrompt: 'You are a helpful AI agent designed to automate tasks efficiently.',
    memoryLimit: 1000,
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!agent) return;
    setConfig((previous) => ({
      ...previous,
      name: agent.name,
      description: agent.description,
      status: agent.status,
    }));
    setNewTag('');
  }, [agent]);

  const handleSave = async () => {
    if (!agent) return;
    setIsSaving(true);
    try {
      await updateAgent(agent.id, {
        name: config.name,
        description: config.description,
        status: config.status,
      });
      toast({
        title: 'Agent Updated',
        description: 'Agent configuration has been saved successfully.',
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update agent';
      toast({
        title: 'Update failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
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
      tags: config.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  if (!agent) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Agent: {agent.name}
          </DialogTitle>
          <DialogDescription>
            Customize your agent's behavior, settings, and workflows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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

            <div className="grid grid-cols-2 gap-4">
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
                  onValueChange={(value) => setConfig({ ...config, priority: value })}
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

            <div className="flex items-center justify-between">
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

            <div className="flex items-center justify-between">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTasks">Max concurrent tasks</Label>
                <Input
                  id="maxTasks"
                  type="number"
                  min="1"
                  max="1000"
                  value={config.maxTasks}
                  onChange={(e) =>
                    setConfig({ ...config, maxTasks: parseInt(e.target.value, 10) || 100 })
                  }
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
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      memoryLimit: parseInt(e.target.value, 10) || 1000,
                    })
                  }
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

            <div className="flex gap-2">
              <Input
                placeholder="Add new tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
              />
              <Button size="sm" onClick={addTag}>
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
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Workflows</h4>
              <Button variant="outline" size="sm">
                <Workflow className="h-4 w-4 mr-2" />
                Manage Workflows
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No workflows configured for this agent. Click "Manage Workflows" to add automation workflows.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!config.name.trim() || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
