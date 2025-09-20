import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentCard } from './AgentCard';
import { CreateAgentDialog, type CreateAgentFormValues } from './CreateAgentDialog';
import { AgentMemoryDialog } from './AgentMemoryDialog';
import { AgentSettingsDialog } from './AgentSettingsDialog';
import { AgentConfigureDialog, type AgentConfiguration } from './AgentConfigureDialog';
import { WorkflowDialog } from './WorkflowDialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  WifiOff,
  Workflow,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAgents } from '@/hooks/use-agents';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export const AgentDashboard: React.FC = () => {
  const { agents, setAgents, isOnline, hasPendingSync, lastSyncedAt } = useAgents();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [selectedAgentMemory, setSelectedAgentMemory] = useState<string | null>(null);
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = useMemo(() => ({
    active: agents.filter(a => a.status === 'active').length,
    tasks: agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0),
    memory: agents.reduce((sum, agent) => sum + agent.memoryItems, 0),
  }), [agents]);

  const lastSyncedRelative = useMemo(() => {
    if (!lastSyncedAt) return null;
    try {
      return formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true });
    } catch (error) {
      console.warn('Failed to format sync timestamp', error);
      return null;
    }
  }, [lastSyncedAt]);

  const handleCreateAgent = (agentData: CreateAgentFormValues) => {
    const newAgent = {
      id: Date.now().toString(),
      ...agentData,
      tasksCompleted: 0,
      memoryItems: 0,
      lastActive: 'Just created'
    };
    setAgents(prev => [...prev, newAgent]);
    setShowCreateDialog(false);
    toast({
      title: 'Agent Created',
      description: `${agentData.name} has been successfully created.`,
    });
  };

  const handleConfigureAgent = (agentId: string, config: AgentConfiguration) => {
    setAgents(prev => prev.map(agent =>
      agent.id === agentId
        ? { ...agent, name: config.name, description: config.description, status: config.status }
        : agent
    ));
    setSelectedAgentConfig(null);
    toast({
      title: 'Agent Updated',
      description: 'Agent configuration has been saved successfully.',
    });
  };

  const getSelectedAgent = () => {
    return agents.find(agent => agent.id === selectedAgentConfig) || null;
  };

  return (
    <div className={cn('min-h-screen bg-background', isMobile ? 'p-4' : 'p-6')}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className={cn('flex justify-between gap-4', isMobile ? 'flex-col' : 'flex-col sm:flex-row sm:items-center')}>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AI Agent Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your intelligent automation agents
            </p>
            {lastSyncedRelative && (
              <p className="text-xs text-muted-foreground">
                Last synced {lastSyncedRelative}
              </p>
            )}
          </div>
          <div className={cn('flex gap-2', isMobile ? 'flex-col w-full' : 'items-center')}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWorkflowDialog(true)}
              className={cn(isMobile && 'w-full justify-center')}
            >
              <Workflow className="h-4 w-4 mr-2" />
              Workflows
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsDialog(true)}
              className={cn(isMobile && 'w-full justify-center')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className={cn('bg-gradient-primary hover:opacity-90 transition-opacity', isMobile && 'w-full justify-center')}
              size={isMobile ? 'sm' : 'default'}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {!isOnline && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100 flex items-start gap-3">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Offline mode</p>
                <p>Your cached agents are available. Changes will sync when you reconnect.</p>
              </div>
            </div>
          )}

          {isOnline && hasPendingSync && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100 flex items-start gap-3">
              <RefreshCcw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              <div>
                <p className="font-medium">Syncing changes</p>
                <p>Your recent updates are being uploaded to the automation hub.</p>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className={cn('flex gap-4', isMobile ? 'flex-col' : 'flex-row items-center')}>
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
        <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3')}>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-active">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active Agents</div>
          </div>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-task">{stats.tasks}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-memory">{stats.memory}</div>
            <div className="text-sm text-muted-foreground">Memory Items</div>
          </div>
        </div>

        {/* Agents Grid */}
        <div className={cn('grid grid-cols-1 gap-6', !isMobile && 'md:grid-cols-2 lg:grid-cols-3')}>
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
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              No agents found matching your search.
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
