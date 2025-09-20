import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentCard } from './AgentCard';
import { CreateAgentDialog, type CreateAgentFormValues } from './CreateAgentDialog';
import { AgentMemoryDialog } from './AgentMemoryDialog';
import { AgentSettingsDialog } from './AgentSettingsDialog';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedAgentMemory, setSelectedAgentMemory] = useState<string | null>(null);
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const filteredAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query)
    );
  }, [agents, searchQuery]);
  const handleCreateAgent = async (agentData: any) => {
    setIsCreating(true);
    try {
      await createAgent(agentData);
      setShowCreateDialog(false);
      toast({
        title: 'Agent Created',
        description: `${agentData.name} has been successfully created.`,
      });
    } catch (error: any) {
      toast({
        title: 'Unable to create agent',
        description: error?.message ?? 'An unexpected error occurred while creating the agent.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
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
        )}
      </div>

      <CreateAgentDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateAgent}
        isSubmitting={isCreating}
      />

      <AgentSettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
      />

      <AgentConfigureDialog
        open={selectedAgentConfig !== null}
        onClose={() => setSelectedAgentConfig(null)}
        agent={selectedAgent}
      />

      <AgentMemoryDialog
        open={selectedAgentMemory !== null}
        onClose={() => setSelectedAgentMemory(null)}
        agentId={selectedAgentMemory || ''}
      />
    </div>
  );
};
