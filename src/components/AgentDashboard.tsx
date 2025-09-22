import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AgentCard } from './AgentCard';
import { CreateAgentDialog } from './CreateAgentDialog';
import { AgentMemoryDialog } from './AgentMemoryDialog';
import { AgentSettingsDialog } from './AgentSettingsDialog';
import { AgentConfigureDialog } from './AgentConfigureDialog';
import { WorkflowDialog } from './WorkflowDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Settings, Workflow } from 'lucide-react';
import { useAgents } from '@/hooks/use-agents';
import { useAuth } from '@/hooks/use-auth';

export const AgentDashboard: React.FC = () => {
  const { agents, setAgents, isFetching } = useAgents();
  const { user, workspaces, currentWorkspace, currentRole, setWorkspace, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [selectedAgentMemory, setSelectedAgentMemory] = useState<string | null>(null);
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<string | null>(null);
  const { toast } = useToast();

  const canManageSettings = currentRole === 'owner' || currentRole === 'admin';
  const canManageWorkflows = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'editor';
  const canCreateAgent = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'editor';
  const canConfigureAgent = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'editor';
  const canReviewMemory = currentRole === 'owner' || currentRole === 'admin';

  useEffect(() => {
    setSelectedAgentConfig(null);
    setSelectedAgentMemory(null);
    setShowCreateDialog(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!canCreateAgent) setShowCreateDialog(false);
  }, [canCreateAgent]);

  useEffect(() => {
    if (!canManageSettings) setShowSettingsDialog(false);
  }, [canManageSettings]);

  useEffect(() => {
    if (!canManageWorkflows) setShowWorkflowDialog(false);
  }, [canManageWorkflows]);

  useEffect(() => {
    if (!canConfigureAgent) setSelectedAgentConfig(null);
  }, [canConfigureAgent]);

  useEffect(() => {
    if (!canReviewMemory) setSelectedAgentMemory(null);
  }, [canReviewMemory]);

  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [agents, searchQuery],
  );

  const handleCreateAgent = (agentData: any) => {
    if (!currentWorkspace || !canCreateAgent) {
      toast({
        title: 'Insufficient permissions',
        description: 'You need edit access to create new agents in this workspace.',
      });
      return;
    }

    const newAgent = {
      id: Date.now().toString(),
      workspaceId: currentWorkspace.id,
      ...agentData,
      tasksCompleted: 0,
      memoryItems: 0,
      lastActive: 'Just created',
    };

    setAgents((previous) => [...previous, newAgent]);
    setShowCreateDialog(false);
    toast({
      title: 'Agent Created',
      description: `${agentData.name} has been successfully created.`,
    });
  };

  const handleConfigureAgent = (agentId: string, config: any) => {
    if (!canConfigureAgent) {
      toast({
        title: 'View only',
        description: 'Your role does not allow updating agent settings.',
      });
      return;
    }

    setAgents((previous) =>
      previous.map((agent) =>
        agent.id === agentId
          ? { ...agent, name: config.name, description: config.description, status: config.status }
          : agent,
      ),
    );
    setSelectedAgentConfig(null);
    toast({
      title: 'Agent Updated',
      description: 'Agent configuration has been saved successfully.',
    });
  };

  const openConfigureDialog = (agentId: string) => {
    if (!canConfigureAgent) {
      toast({
        title: 'View only',
        description: 'You do not have permission to configure agents in this workspace.',
      });
      return;
    }
    setSelectedAgentConfig(agentId);
  };

  const openMemoryDialog = (agentId: string) => {
    if (!canReviewMemory) {
      toast({
        title: 'Restricted content',
        description: 'Only owners and admins can inspect memory stores.',
      });
      return;
    }
    setSelectedAgentMemory(agentId);
  };

  const getSelectedAgent = () => agents.find((agent) => agent.id === selectedAgentConfig) || null;

  if (isLoading && !currentWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading your workspace…
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-2xl font-semibold">No workspace assigned</h2>
        <p className="max-w-md text-muted-foreground">
          Ask a workspace owner to invite you so you can collaborate on agents, workflows, and runs.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AI Agent Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentWorkspace.description ?? 'Manage your intelligent automation agents'}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</Label>
              <Select
                value={currentWorkspace.id}
                onValueChange={setWorkspace}
                disabled={workspaces.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name} • {workspace.role.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.name ?? 'Guest'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWorkflowDialog(true)}
              disabled={!canManageWorkflows}
            >
              <Workflow className="h-4 w-4 mr-2" />
              Workflows
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsDialog(true)}
              disabled={!canManageSettings}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={!canCreateAgent}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-active">
              {agents.filter((agent) => agent.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Agents</div>
          </div>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-task">
              {currentWorkspace.summary?.workflowCount ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Workflows</div>
          </div>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-memory">
              {currentWorkspace.summary?.credentialCount ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Credentials</div>
          </div>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-primary">
              {currentWorkspace.summary?.runCount ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Runs Tracked</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              canConfigure={canConfigureAgent}
              canViewMemory={canReviewMemory}
              onEdit={openConfigureDialog}
              onViewMemory={openMemoryDialog}
            />
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {isFetching ? 'Loading agents…' : 'No agents found matching your search.'}
            </p>
          </div>
        )}
      </div>

      <CreateAgentDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateAgent}
      />

      <AgentSettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
      />

      <WorkflowDialog
        open={showWorkflowDialog}
        onClose={() => setShowWorkflowDialog(false)}
      />

      <AgentConfigureDialog
        open={selectedAgentConfig !== null}
        onClose={() => setSelectedAgentConfig(null)}
        agent={getSelectedAgent()}
        onSave={handleConfigureAgent}
      />

      <AgentMemoryDialog
        open={selectedAgentMemory !== null}
        onClose={() => setSelectedAgentMemory(null)}
        agentId={selectedAgentMemory || ''}
      />
    </div>
  );
};