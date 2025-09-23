import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Database,
  KeyRound,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Sparkles,
  Users,
  WifiOff,
  Workflow,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { AgentCard } from './AgentCard';
import { AgentConfigureDialog } from './AgentConfigureDialog';
import { AgentMemoryDialog } from './AgentMemoryDialog';
import { AgentSettingsDialog } from './AgentSettingsDialog';
import { CredentialsManagerDialog } from './credentials/CredentialsManagerDialog';
import { CreateAgentDialog, type CreateAgentFormValues } from './CreateAgentDialog';

import { useAgents } from '@/hooks/use-agents';
import { useToast } from '@/hooks/use-toast';
import type { Agent } from '@/types/agent';

const offlineDefault = typeof navigator !== 'undefined' ? navigator.onLine : true;

export const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    agents,
    createAgent,
    updateAgent,
    deleteAgent,
    isLoading,
    error: agentLoadError,
  } = useAgents();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [selectedAgentMemory, setSelectedAgentMemory] = useState<string | null>(null);
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(offlineDefault);

  const env = import.meta.env as Record<string, string | undefined>;
  const userId = env?.VITE_USER_ID ?? 'demo-user';
  const workspaceId = env?.VITE_WORKSPACE_ID ?? 'demo-workspace';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLastSynced(new Date());
    }
  }, [agents, isLoading]);

  const lastSyncedRelative = useMemo(() => {
    if (!lastSynced) {
      return null;
    }
    return formatDistanceToNow(lastSynced, { addSuffix: true });
  }, [lastSynced]);

  const filteredAgents = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return agents;
    }

    return agents.filter((agent) => {
      const haystack = [agent.name, agent.description, agent.status]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(normalized));
    });
  }, [agents, searchQuery]);

  const selectedAgent: Agent | null = useMemo(() => {
    if (!selectedAgentConfig) {
      return null;
    }
    return agents.find((agent) => agent.id === selectedAgentConfig) ?? null;
  }, [agents, selectedAgentConfig]);

  const kpiTiles = useMemo(
    () => {
      const totalAgents = agents.length;
      const activeAgents = agents.filter((agent) => agent.status === 'active').length;
      const learningAgents = agents.filter((agent) => agent.status === 'learning').length;
      const completedTasks = agents.reduce((total, agent) => total + (agent.tasksCompleted ?? 0), 0);
      const totalMemory = agents.reduce((total, agent) => total + (agent.memoryItems ?? 0), 0);
      const completionRate = totalAgents > 0
        ? Math.round((completedTasks / Math.max(totalAgents, 1)) * 10) / 10
        : 0;

      return [
        {
          title: 'Active agents',
          value: activeAgents,
          description: `${totalAgents} total`,
          icon: Users,
        },
        {
          title: 'Tasks completed',
          value: completedTasks,
          description: `${completionRate} avg per agent`,
          icon: CheckCircle2,
        },
        {
          title: 'Knowledge items',
          value: totalMemory,
          description: `${learningAgents} learning`,
          icon: Database,
        },
        {
          title: 'Automation health',
          value: activeAgents === totalAgents && totalAgents > 0 ? 'Optimal' : 'Monitoring',
          description: hasPendingSync ? 'Syncing recent changes' : 'All systems nominal',
          icon: Sparkles,
        },
      ];
    },
    [agents, hasPendingSync]
  );

  const handleCreateAgent = async (values: CreateAgentFormValues) => {
    setIsCreating(true);
    setHasPendingSync(true);

    try {
      const created = await createAgent(values);
      toast({
        title: 'Agent Created',
        description: `${created.name} is ready to assist your workflows.`,
      });
      setShowCreateDialog(false);
      setLastSynced(new Date());
      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred.';
      toast({
        title: 'Unable to create agent',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsCreating(false);
      setHasPendingSync(false);
    }
  };

  const handleOpenWorkflows = () => {
    navigate('/workflows');
  };

  const handleBuildWorkflow = (agentId: string) => {
    navigate(`/workflows?agentId=${encodeURIComponent(agentId)}`);
  };

  const renderLoadingState = () => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={`agent-skeleton-${index}`} className="border-dashed border-border/60">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-12 text-center">
      <Sparkles className="h-10 w-10 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">No agents found</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first automation agent to orchestrate workflows, manage memory, and trigger tasks across your workspace.
      </p>
      <Button className="mt-6" onClick={() => setShowCreateDialog(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Create agent
      </Button>
    </div>
  );

  const renderErrorState = (error: Error) => (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
      <h3 className="text-base font-semibold text-destructive">Unable to load agents</h3>
      <p className="mt-2 text-sm text-destructive/80">
        {error.message || 'An unexpected error occurred while fetching your agents.'}
      </p>
      <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
        Try creating an agent
      </Button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Agent Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your intelligent automation agents
          </p>
          {lastSyncedRelative && (
            <p className="text-xs text-muted-foreground">Last synced {lastSyncedRelative}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleOpenWorkflows}>
            <Workflow className="h-4 w-4 mr-2" />
            Workflows
          </Button>
          <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" onClick={() => setShowCredentialsDialog(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Credentials
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiTiles.map(({ title, value, description, icon: Icon }) => (
          <Card key={title} className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{value}</div>
              <CardDescription className="text-xs text-muted-foreground/80">
                {description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {!isOnline && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Offline mode</p>
              <p>Your cached agents are available. Changes will sync when you reconnect.</p>
            </div>
          </div>
        )}

        {isOnline && hasPendingSync && (
          <div className="flex items-start gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <RefreshCcw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            <div>
              <p className="font-medium">Syncing changes</p>
              <p>Your recent updates are being uploaded to the automation hub.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {agentLoadError ? (
        renderErrorState(agentLoadError)
      ) : isLoading && agents.length === 0 ? (
        renderLoadingState()
      ) : filteredAgents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={setSelectedAgentConfig}
              onViewMemory={setSelectedAgentMemory}
              onBuildWorkflow={handleBuildWorkflow}
            />
          ))}
        </div>
      ) : (
        renderEmptyState()
      )}

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
        agentId={selectedAgentMemory ?? ''}
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

