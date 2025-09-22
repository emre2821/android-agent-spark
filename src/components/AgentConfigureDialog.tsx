import React, { useEffect, useState } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCollaboration } from '@/hooks/use-collaboration';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, X, Plus, Workflow, Users, Lock, Unlock, RefreshCw } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'learning';
  tasksCompleted: number;
  memoryItems: number;
  lastActive: string;
}

interface AgentConfigureDialogProps {
  open: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSave: (agentId: string, config: any) => void;
}

export const AgentConfigureDialog: React.FC<AgentConfigureDialogProps> = ({
  open,
  onClose,
  agent,
  onSave,
}) => {
  const { toast } = useToast();
  const user = useCurrentUser();
  const collaboration = useCollaboration({
    resourceId: agent ? `agent:${agent.id}:config` : null,
    user,
  });
  const { isLockedByCurrentUser, isLockedByAnother, lock, presence, conflictMessage, conflictLock } = collaboration;
  const [config, setConfig] = useState({
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

  useEffect(() => {
    if (!agent) return;
    setConfig({
      name: agent.name,
      description: agent.description,
      status: agent.status,
      autoStart: true,
      learningMode: true,
      maxTasks: 100,
      priority: 'medium',
      tags: ['automation', 'ai'],
      systemPrompt: 'You are a helpful AI agent designed to automate tasks efficiently.',
      memoryLimit: 1000,
    });
  }, [agent]);

  useEffect(() => {
    if (!open && isLockedByCurrentUser && agent) {
      collaboration.releaseLock({ reason: 'Dialog closed' });
    }
  }, [open, isLockedByCurrentUser, collaboration.releaseLock, agent?.id]);

  const handleSave = async () => {
    if (!agent) return;

    if (isLockedByAnother) {
      toast({
        title: 'Configuration locked',
        description: `Currently edited by ${lock?.userName}.`,
        variant: 'destructive',
      });
      return;
    }

    if (!isLockedByCurrentUser) {
      const lockAttempt = await collaboration.requestLock({ reason: 'Updating agent configuration' });
      if (!lockAttempt.ok) {
        toast({
          title: 'Unable to acquire lock',
          description: lockAttempt.message || 'Try again once the current editor finishes.',
          variant: 'destructive',
        });
        return;
      }
    }

    const changedFields = Object.entries(config)
      .filter(([key, value]) => {
        if (!(key in (agent as any))) return true;
        return (agent as any)[key] !== value;
      })
      .map(([key]) => key);

    const saveResult = await collaboration.saveChanges('Agent configuration updated', {
      changedFields,
    });

    if (!saveResult.ok) {
      toast({
        title: 'Save conflict',
        description: saveResult.message || 'Another collaborator saved conflicting changes.',
        variant: 'destructive',
      });
      return;
    }

    onSave(agent.id, config);
    toast({ title: 'Configuration saved', description: 'Changes recorded in the activity feed.' });
    onClose();
  };

  const handleRequestLock = async () => {
    const result = await collaboration.requestLock({ reason: 'Editing agent configuration' });
    if (!result.ok) {
      toast({
        title: 'Unable to acquire lock',
        description: result.message || 'Another collaborator currently holds the lock.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Lock acquired', description: 'You now control this configuration.' });
    }
  };

  const handleReleaseLock = async () => {
    const result = await collaboration.releaseLock({ reason: 'Finished editing configuration' });
    if (result.ok) {
      toast({ title: 'Lock released', description: 'Others can now edit this configuration.' });
    }
  };

  const handleForceUnlock = async () => {
    const reason = window.prompt('Enter a reason for force unlocking this configuration.');
    if (reason === null) return;
    const result = await collaboration.forceUnlock(reason || 'Force unlock requested');
    if (result.ok) {
      toast({ title: 'Lock overridden', description: 'You now control this configuration.' });
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
      tags: config.tags.filter(tag => tag !== tagToRemove),
    });
  };

  if (!agent) return null;

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
          <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="font-medium text-foreground">Active collaborators</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {presence.length === 0 ? (
                  <Badge variant="outline">Only you</Badge>
                ) : (
                  presence.map((participant) => (
                    <Badge
                      key={participant.id}
                      variant={participant.isCurrentUser ? 'secondary' : 'outline'}
                    >
                      {participant.isCurrentUser ? 'You' : participant.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isLockedByCurrentUser ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  You hold the lock
                </Badge>
              ) : isLockedByAnother ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Locked by {lock?.userName}
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Unlock className="h-3.5 w-3.5" />
                  Available for editing
                </Badge>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {!isLockedByCurrentUser && (
                  <Button variant="outline" size="sm" onClick={handleRequestLock}>
                    <Lock className="mr-2 h-4 w-4" />
                    Request control
                  </Button>
                )}
                {isLockedByCurrentUser && (
                  <Button variant="outline" size="sm" onClick={handleReleaseLock}>
                    <Unlock className="mr-2 h-4 w-4" />
                    Release lock
                  </Button>
                )}
                {isLockedByAnother && (
                  <Button variant="destructive" size="sm" onClick={handleForceUnlock}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Force unlock
                  </Button>
                )}
              </div>
            </div>
          </div>

          {conflictMessage && (
            <Alert variant="destructive">
              <AlertTitle>Save conflict detected</AlertTitle>
              <AlertDescription>
                {conflictMessage}
                {conflictLock && (
                  <span className="block text-xs text-muted-foreground">
                    Current lock owner: {conflictLock.userName}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

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
                <Select value={config.status} onValueChange={(value: any) => setConfig({ ...config, status: value })}>
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
                <Select value={config.priority} onValueChange={(value) => setConfig({ ...config, priority: value })}>
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};