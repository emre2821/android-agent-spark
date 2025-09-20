import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentCard } from './AgentCard';
import { CreateAgentDialog } from './CreateAgentDialog';
import { AgentMemoryDialog } from './AgentMemoryDialog';
import { AgentSettingsDialog } from './AgentSettingsDialog';
import { AgentConfigureDialog } from './AgentConfigureDialog';
import { WorkflowDialog } from './WorkflowDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Settings, Workflow } from 'lucide-react';
import { useAgents } from '@/hooks/use-agents';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { Agent, AgentDraft } from '@/types/agent';
export const AgentDashboard: React.FC = () => {
  const { agents, setAgents } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [selectedAgentMemory, setSelectedAgentMemory] = useState<string | null>(null);
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateAgent = (agentData: AgentDraft) => {
    const newAgent: Agent = {
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

  const handleConfigureAgent = (agentId: string, config: AgentDraft) => {
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

  const getSelectedAgent = (): Agent | null => {
    return agents.find(agent => agent.id === selectedAgentConfig) || null;
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="bg-gradient-primary bg-clip-text text-3xl font-bold text-transparent">
              AI Agent Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your intelligent automation agents
            </p>
          </div>
          <div
            className={cn(
              'flex gap-2',
              isMobile ? 'w-full flex-col' : 'flex-row'
            )}
          >
            <Button
              variant="outline"
              size={isMobile ? 'default' : 'sm'}
              onClick={() => setShowWorkflowDialog(true)}
              className={cn(isMobile && 'w-full justify-center text-base')}
            >
              <Workflow className="h-4 w-4 mr-2" />
              Workflows
            </Button>
            <Button
              variant="outline"
              size={isMobile ? 'default' : 'sm'}
              onClick={() => setShowSettingsDialog(true)}
              className={cn(isMobile && 'w-full justify-center text-base')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              size={isMobile ? 'default' : 'sm'}
              className={cn(
                'bg-gradient-primary transition-opacity hover:opacity-90',
                isMobile && 'w-full justify-center text-base'
              )}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="gradient-card rounded-lg border border-border/50 p-4">
            <div className="text-2xl font-bold text-agent-active">
              {agents.filter(a => a.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Agents</div>
          </div>
          <div className="gradient-card rounded-lg border border-border/50 p-4">
            <div className="text-2xl font-bold text-agent-task">
              {agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>
          <div className="gradient-card rounded-lg border border-border/50 p-4">
            <div className="text-2xl font-bold text-agent-memory">
              {agents.reduce((sum, agent) => sum + agent.memoryItems, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Memory Items</div>
          </div>
        </div>

        {/* Agents Grid */}
        <div
          className={cn(
            'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6',
            isMobile && 'gap-3'
          )}
        >
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
          <div className="py-12 text-center">
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