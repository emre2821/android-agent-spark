import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentCard } from './AgentCard';
import { CreateAgentDialog } from './CreateAgentDialog';
import { AgentMemoryDialog } from './AgentMemoryDialog';
import { AgentSettingsDialog } from './AgentSettingsDialog';
import { AgentConfigureDialog } from './AgentConfigureDialog';
import { WorkflowDialog } from './WorkflowDialog';
import { CredentialsManagerDialog } from './credentials/CredentialsManagerDialog';
import { useToast } from '@/hooks/use-toast';
import { Key, Plus, Search, Settings, Workflow } from 'lucide-react';
import { useAgents } from '@/hooks/use-agents';
export const AgentDashboard: React.FC = () => {
  const { agents, setAgents } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [selectedAgentMemory, setSelectedAgentMemory] = useState<string | null>(null);
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateAgent = (agentData: any) => {
    const newAgent = {
      id: Date.now().toString(),
      ...agentData,
      tasksCompleted: 0,
      memoryItems: 0,
      lastActive: 'Just created'
    };
    setAgents([...agents, newAgent]);
    setShowCreateDialog(false);
    toast({
      title: "Agent Created",
      description: `${agentData.name} has been successfully created.`,
    });
  };

  const handleConfigureAgent = (agentId: string, config: any) => {
    setAgents(agents.map(agent => 
      agent.id === agentId 
        ? { ...agent, name: config.name, description: config.description, status: config.status }
        : agent
    ));
    setSelectedAgentConfig(null);
    toast({
      title: "Agent Updated",
      description: "Agent configuration has been saved successfully.",
    });
  };

  const getSelectedAgent = () => {
    return agents.find(agent => agent.id === selectedAgentConfig) || null;
  };

  const userId = 'demo-user';
  const workspaceId = 'default-workspace';

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AI Agent Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your intelligent automation agents
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWorkflowDialog(true)}
            >
              <Workflow className="h-4 w-4 mr-2" />
              Workflows
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCredentialsDialog(true)}
            >
              <Key className="h-4 w-4 mr-2" />
              Credentials
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsDialog(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-active">
              {agents.filter(a => a.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Agents</div>
          </div>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-task">
              {agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-memory">
              {agents.reduce((sum, agent) => sum + agent.memoryItems, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Memory Items</div>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={(id) => setSelectedAgentConfig(id)}
              onViewMemory={(id) => setSelectedAgentMemory(id)}
            />
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No agents found matching your search.</p>
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
        userId={userId}
        workspaceId={workspaceId}
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

      <CredentialsManagerDialog
        open={showCredentialsDialog}
        onClose={() => setShowCredentialsDialog(false)}
        userId={userId}
        workspaceId={workspaceId}
      />
    </div>
  );
};