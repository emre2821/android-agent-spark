import React, { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, X, Plus, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Agent, AgentStatus } from '@/types/agent';

interface AgentConfigureDialogProps {
  open: boolean;
  onClose: () => void;
  agent: Agent | null;
}

type AgentPriority = 'low' | 'medium' | 'high' | 'critical';

type AgentConfigurationState = {
  name: string;
  description: string;
  status: AgentStatus;
  priority: AgentPriority;
  autoStart: boolean;
  learningMode: boolean;
  maxTasks: number;
  memoryLimit: number;
  systemPrompt: string;
  tags: string[];
};

type AgentWithConfiguration = Agent & Partial<
  Pick<AgentConfigurationState, 'priority' | 'autoStart' | 'learningMode' | 'maxTasks' | 'memoryLimit' | 'systemPrompt' | 'tags'>
>;

const DEFAULT_CONFIG: AgentConfigurationState = {
  name: '',
  description: '',
  status: 'active',
  priority: 'medium',
  autoStart: false,
  learningMode: true,
  maxTasks: 100,
  memoryLimit: 1000,
  systemPrompt: '',
  tags: [],
};

const deriveConfigFromAgent = (agent: Agent | null): AgentConfigurationState => {
  if (!agent) {
    return { ...DEFAULT_CONFIG };
  }

  const configSource = agent as AgentWithConfiguration;

  return {
    ...DEFAULT_CONFIG,
    name: agent.name,
    description: agent.description,
    status: agent.status ?? DEFAULT_CONFIG.status,
    priority: (configSource.priority as AgentPriority | undefined) ?? DEFAULT_CONFIG.priority,
    autoStart:
      typeof configSource.autoStart === 'boolean' ? configSource.autoStart : DEFAULT_CONFIG.autoStart,
    learningMode:
      typeof configSource.learningMode === 'boolean'
        ? configSource.learningMode
        : DEFAULT_CONFIG.learningMode,
    maxTasks:
      typeof configSource.maxTasks === 'number' && !Number.isNaN(configSource.maxTasks)
        ? configSource.maxTasks
        : DEFAULT_CONFIG.maxTasks,
    memoryLimit:
      typeof configSource.memoryLimit === 'number' && !Number.isNaN(configSource.memoryLimit)
        ? configSource.memoryLimit
        : DEFAULT_CONFIG.memoryLimit,
    systemPrompt:
      typeof configSource.systemPrompt === 'string'
        ? configSource.systemPrompt
        : DEFAULT_CONFIG.systemPrompt,
    tags: Array.isArray(configSource.tags) ? [...configSource.tags] : [...DEFAULT_CONFIG.tags],
  };
};

export const AgentConfigureDialog: React.FC<AgentConfigureDialogProps> = ({
  open,
  onClose,
  agent,
}) => {
  const isMobile = useIsMobile();
  const [config, setConfig] = useState<AgentConfigurationState>(DEFAULT_CONFIG);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setConfig(deriveConfigFromAgent(agent));
    setNewTag('');
  }, [agent, open]);

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !config.tags.includes(trimmed)) {
      setConfig({
        ...config,
        tags: [...config.tags, trimmed],
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

  const handleSave = () => {
    setIsSaving(true);
    // Placeholder save implementation - in a real app we'd persist the config here.
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 300);
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        className={cn(
          'sm:max-w-[600px] max-h-[80vh] overflow-y-auto',
          isMobile &&
            'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none overflow-y-auto rounded-2xl border border-border/50 p-0'
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={config.status}
                  onValueChange={(value) =>
                    setConfig({ ...config, status: value as AgentStatus })
                  }
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

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={config.priority}
                  onValueChange={(value) =>
                    setConfig({ ...config, priority: value as AgentPriority })
                  }
                >
                  <SelectTrigger id="priority">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxTasks">Max concurrent tasks</Label>
                <Input
                  id="maxTasks"
                  type="number"
                  min="1"
                  max="1000"
                  value={config.maxTasks}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxTasks: Number.parseInt(e.target.value, 10) || DEFAULT_CONFIG.maxTasks,
                    })
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
                      memoryLimit:
                        Number.parseInt(e.target.value, 10) || DEFAULT_CONFIG.memoryLimit,
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

            <div className="flex items-center gap-2">
              <Input
                placeholder="Add new tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
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
              <Button type="button" variant="outline">
                <Workflow className="h-4 w-4 mr-2" />
                Manage Workflows
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No workflows configured for this agent. Click "Manage Workflows" to add automation workflows.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
