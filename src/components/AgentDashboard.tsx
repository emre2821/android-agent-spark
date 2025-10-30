import React, { useEffect, useMemo, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AgentCard } from './AgentCard';
import { AgentConfigureDialog } from './AgentConfigureDialog';
import { AgentMemoryDialog } from './AgentMemoryDialog';
import { AgentSettingsDialog } from './AgentSettingsDialog';
import { CreateAgentDialog, type CreateAgentFormValues } from './CreateAgentDialog';
import { CredentialsManagerDialog } from './credentials/CredentialsManagerDialog';
import { WorkflowDialog } from './WorkflowDialog';
import { useAgents } from '@/hooks/use-agents';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Agent } from '@/types/agent';

const offlineDefault = typeof navigator !== 'undefined' ? navigator.onLine : true;

const roleAllows = (role: string | null, allowed: Array<'owner' | 'admin' | 'editor' | 'viewer'>) =>
  role ? allowed.includes(role as never) : false;

export const AgentDashboard: React.FC = () => {
  const { agents, createAgent, isLoading, isFetching } = useAgents();
  const { toast } = useToast();
  const { user, workspaces, currentWorkspace, currentRole, setWorkspace } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [selectedAgentMemory, setSelectedAgentMemory] = useState<string | null>(null);
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(offlineDefault);

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
    setHasPendingSync(isFetching);
    if (!isFetching) {
      setLastSynced(new Date());
    }
  }, [isFetching]);

  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) =>
        [agent.name, agent.description].some((value) =>
          value.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      ),
    [agents, searchQuery],
  );

  const selectedAgent = useMemo<Agent | null>(
    () => agents.find((agent) => agent.id === selectedAgentConfig) ?? null,
    [agents, selectedAgentConfig],
  );

  const handleCreateAgent = async (values: CreateAgentFormValues) => {
    setIsCreating(true);
    try {
      await createAgent(values);
      setShowCreateDialog(false);
      toast({
        title: 'Agent Created',
        description: `${values.name} has been successfully created.`,
      });
    } catch (error) {
      toast({
        title: 'Create agent failed',
        description: error instanceof Error ? error.message : 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const canManageWorkflows = roleAllows(currentRole, ['owner', 'admin', 'editor']);
  const canManageSettings = roleAllows(currentRole, ['owner', 'admin']);
  const canCreateAgent = roleAllows(currentRole, ['owner', 'admin', 'editor']);
  const canConfigureAgent = roleAllows(currentRole, ['owner', 'admin', 'editor']);
  const canReviewMemory = roleAllows(currentRole, ['owner', 'admin']);
  const canManageCredentials = roleAllows(currentRole, ['owner', 'admin']);

  const activeAgents = useMemo(() => agents.filter((agent) => agent.status === 'active').length, [agents]);
  const totalTasks = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0),
    [agents],
  );
  const totalMemoryItems = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.memoryItems, 0),
    [agents],
  );

  const lastSyncedRelative = lastSynced
    ? formatDistanceToNow(lastSynced, { addSuffix: true })
    : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="bg-gradient-primary bg-clip-text text-3xl font-bold text-transparent">
              AI Agent Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your intelligent automation agents
            </p>
            {lastSyncedRelative && (
              <p className="text-xs text-muted-foreground">Last synced {lastSyncedRelative}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageWorkflows && (
              <Button variant="outline" onClick={() => setShowWorkflowDialog(true)}>
                <Workflow className="mr-2 h-4 w-4" />
                Workflows
              </Button>
            )}
            {canManageSettings && (
              <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            )}
            {canManageCredentials && (
              <Button variant="outline" onClick={() => setShowCredentialsDialog(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Credentials
              </Button>
            )}
            {canCreateAgent && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-primary hover:opacity-90"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Agent
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            {(!isOnline || hasPendingSync) && (
              <div className="space-y-3">
                {!isOnline && (
                  <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                    <WifiOff className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium">Offline mode</p>
                      <p>Your cached agents are available. Changes will sync when you reconnect.</p>
                    </div>
                  </div>
                )}
                {isOnline && hasPendingSync && (
                  <div className="flex items-start gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                    <RefreshCcw className="mt-0.5 h-4 w-4 animate-spin" />
                    <div>
                      <p className="font-medium">Syncing changes</p>
                      <p>Your recent updates are being uploaded to the automation hub.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-border/50 bg-card/40 p-4">
              <Label htmlFor="agent-search" className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Search className="h-4 w-4" />
                Search agents
              </Label>
              <Input
                id="agent-search"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <Card className="bg-card/40 border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Workspace Overview</CardTitle>
              <CardDescription>Select a workspace to scope your agents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-select" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Workspace
                </Label>
                <Select
                  value={currentWorkspace?.id ?? ''}
                  onValueChange={(value) => setWorkspace(value)}
                  disabled={workspaces.length <= 1}
                >
                  <SelectTrigger id="workspace-select">
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/40 bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground">Members</p>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
                    <Users className="h-4 w-4 text-primary" />
                    {currentWorkspace?.summary?.agentCount ?? agents.length}
                  </div>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground">Credentials</p>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
                    <KeyRound className="h-4 w-4 text-primary" />
                    {currentWorkspace?.summary?.credentialCount ?? 0}
                  </div>
                </div>
              </div>
              {user && (
                <div className="rounded-lg border border-border/40 bg-background/60 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
                  <p className="mt-1 font-medium">{user.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/60 bg-card/40">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-10 w-10 text-agent-active" />
              <div>
                <p className="text-sm text-muted-foreground">Active agents</p>
                <p className="text-2xl font-semibold">{activeAgents}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardContent className="flex items-center gap-3 p-4">
              <Sparkles className="h-10 w-10 text-agent-task" />
              <div>
                <p className="text-sm text-muted-foreground">Tasks completed</p>
                <p className="text-2xl font-semibold">{totalTasks}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardContent className="flex items-center gap-3 p-4">
              <Database className="h-10 w-10 text-agent-memory" />
              <div>
                <p className="text-sm text-muted-foreground">Memory items</p>
                <p className="text-2xl font-semibold">{totalMemoryItems}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[220px] rounded-xl border border-border/40" />
            ))
          ) : filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                canConfigure={canConfigureAgent}
                canViewMemory={canReviewMemory}
                onEdit={(id) => setSelectedAgentConfig(id)}
                onViewMemory={(id) => setSelectedAgentMemory(id)}
                onBuildWorkflow={canManageWorkflows ? () => setShowWorkflowDialog(true) : undefined}
              />
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-border/40 bg-card/40 p-12 text-center">
              <p className="text-muted-foreground">No agents found matching your search.</p>
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

      <AgentSettingsDialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)} />

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

      <WorkflowDialog open={showWorkflowDialog} onClose={() => setShowWorkflowDialog(false)} />

      <CredentialsManagerDialog
        open={showCredentialsDialog}
        onClose={() => setShowCredentialsDialog(false)}
        userId={user?.id ?? 'anonymous'}
        workspaceId={currentWorkspace?.id ?? 'workspace'}
      />
    </div>
  );
};
