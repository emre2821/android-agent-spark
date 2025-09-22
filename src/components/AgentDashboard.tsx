import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Database,
  KeyRound,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Users,
  WifiOff,
  Workflow,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentCard } from './AgentCard';
import { AgentConfigureDialog } from './AgentConfigureDialog';
import { AgentMemoryDialog } from './AgentMemoryDialog';
import { AgentSettingsDialog } from './AgentSettingsDialog';
import { CreateAgentDialog, type CreateAgentFormValues } from './CreateAgentDialog';
import { CredentialsManagerDialog } from './credentials/CredentialsManagerDialog';
import { useAgents, type Agent } from '@/hooks/use-agents';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_USER_ID = 'demo-user';
const DEFAULT_WORKSPACE_ID = 'demo-workspace';

export const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { agents, isLoading, createAgent, updateAgent, deleteAgent } = useAgents();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [selectedAgentMemory, setSelectedAgentMemory] = useState<string | null>(null);
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  const userId = DEFAULT_USER_ID;
  const workspaceId = DEFAULT_WORKSPACE_ID;

  const withPendingSync = useCallback(
    async <T,>(operation: () => Promise<T>) => {
      setPendingMutations((count) => count + 1);
      try {
        const result = await operation();
        setLastSynced(new Date());
        return result;
      } finally {
        setPendingMutations((count) => Math.max(0, count - 1));
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

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

  const lastSyncedRelative = useMemo(
    () => (lastSynced ? formatDistanceToNow(lastSynced, { addSuffix: true }) : null),
    [lastSynced]
  );

  const hasPendingSync = pendingMutations > 0;

  const filteredAgents = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      return agents;
    }
    return agents.filter((agent) => {
      const name = agent.name?.toLowerCase() ?? '';
      const description = agent.description?.toLowerCase() ?? '';
      return name.includes(term) || description.includes(term);
    });
  }, [agents, searchQuery]);

  const selectedAgent: Agent | null = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentConfig) ?? null,
    [agents, selectedAgentConfig]
  );

  const stats = useMemo(() => {
    const totalAgents = agents.length;
    const activeAgents = agents.filter((agent) => agent.status === 'active').length;
    const totalTasks = agents.reduce((sum, agent) => sum + (agent.tasksCompleted ?? 0), 0);
    const totalMemory = agents.reduce((sum, agent) => sum + (agent.memoryItems ?? 0), 0);

    return {
      totalAgents,
      activeAgents,
      totalTasks,
      totalMemory,
    };
  }, [agents]);

  const handleCreateAgent = useCallback(
    async (values: CreateAgentFormValues) => {
      setIsCreating(true);
      try {
        const payload = {
          name: values.name.trim(),
          description: values.description?.trim() ?? '',
          status: values.status,
        };

        const agent = await withPendingSync(() => createAgent(payload));

        toast({
          title: 'Agent Created',
          description: `${agent.name} is ready to automate your workflows.`,
        });
        setShowCreateDialog(false);
      } catch (error: unknown) {
        toast({
          title: 'Unable to create agent',
          description:
            error instanceof Error
              ? error.message
              : 'Something went wrong while creating the agent.',
          variant: 'destructive',
        });
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [createAgent, toast, withPendingSync]
  );

  const handleBuildWorkflow = useCallback(
    (agentId: string) => {
      navigate(`/workflows?agentId=${encodeURIComponent(agentId)}`);
    },
    [navigate]
  );

  const hasAgents = agents.length > 0;
  void updateAgent;
  void deleteAgent;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI Agent Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your intelligent automation agents
          </p>
          {lastSyncedRelative && (
            <p className="text-xs text-muted-foreground">Last synced {lastSyncedRelative}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/workflows')}
            className="flex items-center"
          >
            <Workflow className="h-4 w-4 mr-2" />
            Workflows
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCredentialsDialog(true)}
            className="flex items-center"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Credentials
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSettingsDialog(true)}
            className="flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </div>
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

      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>
              Showing <strong>{filteredAgents.length}</strong> of{' '}
              <strong>{agents.length}</strong> agents
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.totalAgents}</div>
              <CardDescription>Total agents in your workspace</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Activity className="h-4 w-4 text-agent-active" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.activeAgents}</div>
              <CardDescription>Currently assisting with automations</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
              <Workflow className="h-4 w-4 text-agent-task" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.totalTasks}</div>
              <CardDescription>Lifecycle tasks finished by agents</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Items</CardTitle>
              <Database className="h-4 w-4 text-agent-memory" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.totalMemory}</div>
              <CardDescription>Knowledge stored across agents</CardDescription>
            </CardContent>
          </Card>
        </div>

        <div>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-[260px] w-full" />
              ))}
            </div>
          ) : filteredAgents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={(agentId) => setSelectedAgentConfig(agentId)}
                  onViewMemory={(agentId) => setSelectedAgentMemory(agentId)}
                  onBuildWorkflow={handleBuildWorkflow}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-background/40 px-6 py-12 text-center">
              <div className="rounded-full border border-border/40 bg-muted/20 p-3">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {hasAgents
                    ? 'No agents match your search'
                    : 'You have not created any agents yet'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasAgents
                    ? 'Try a different search term or reset the filters.'
                    : 'Create an agent to begin orchestrating automated workflows.'}
                </p>
              </div>
              {!hasAgents && (
                <Button onClick={() => setShowCreateDialog(true)} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first agent
                </Button>
              )}
            </div>
          )}
        </div>
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

      {showCredentialsDialog && (
        <CredentialsManagerDialog
          open={showCredentialsDialog}
          onClose={() => setShowCredentialsDialog(false)}
          userId={userId}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
};

