import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Database, Eye, Settings, Workflow, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Agent } from '@/types/agent';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types/agent';

interface AgentCardProps {
  agent: Agent;
  canConfigure: boolean;
  canViewMemory: boolean;
  onEdit: (agentId: string) => void;
  onViewMemory: (agentId: string) => void;
  onBuildWorkflow?: (agentId: string) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  canConfigure,
  canViewMemory,
  onEdit,
  onViewMemory,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-agent-active/20 text-agent-active border-agent-active/30';
      case 'inactive':
        return 'bg-agent-inactive/20 text-agent-inactive border-agent-inactive/30';
      case 'learning':
        return 'bg-agent-memory/20 text-agent-memory border-agent-memory/30';
      default:
        return 'bg-muted text-muted-foreground';
  onEdit,
  onViewMemory,
  onBuildWorkflow,
}) => {
  const isMobile = useIsMobile();


export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onEdit,
  onViewMemory,
  onBuildWorkflow,
}) => {
  const isMobile = useIsMobile();

  const statusColor = useMemo(() => statusColorMap[agent.status] ?? 'bg-muted text-muted-foreground', [
    agent.status,
  ]);

  const actionButtonSize = isMobile ? 'default' : 'sm';

  const actionLayout = cn(
    'flex flex-wrap items-center gap-2',
    isMobile ? 'flex-col w-full' : 'justify-end'
  );

  const actionButtonSize = isMobile ? 'default' : 'sm';
  const actionButtonClasses = cn('gap-1', isMobile && 'w-full');

  const lastActiveLabel = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(agent.lastActive), { addSuffix: true });
    } catch (error) {
      return agent.lastActive;
    }
  }, [agent.lastActive]);

  const lastActiveLabel = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(agent.lastActive), { addSuffix: true });
    } catch (error) {
      return agent.lastActive;
    }
  }, [agent.lastActive]);

  return (
    <Card className="agent-card border-border/50 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{agent.name}</CardTitle>
          </div>

        </div>
        <CardDescription className="text-muted-foreground">
          {agent.description || 'No description provided'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className={cn(
            'grid grid-cols-2 gap-4 text-sm text-foreground',
            isMobile && 'grid-cols-1 gap-3'
          )}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-agent-task" />
            <span className="text-muted-foreground">Tasks:</span>
            <span className="font-medium">{agent.tasksCompleted}</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-agent-memory" />
            <span className="text-muted-foreground">Memory:</span>
            <span className="font-medium">{agent.memoryItems}</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Last active: {lastActiveLabel}
        </div>

        <div className="text-xs text-muted-foreground">Last active: {agent.lastActive}</div>


              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => canConfigure && onEdit(agent.id)}
            className="flex-1"
            disabled={!canConfigure}
            title={canConfigure ? undefined : 'Requires editor access'}
            size={actionButtonSize}
            onClick={() => onEdit(agent.id)}

          >
            <Settings className="h-4 w-4" />
            Configure
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => canViewMemory && onViewMemory(agent.id)}
            className="flex-1"
            disabled={!canViewMemory}
            title={canViewMemory ? undefined : 'Only admins can review memory'}
            size={actionButtonSize}
            onClick={() => onViewMemory(agent.id)}

          >
            <Database className="h-4 w-4" />
            Memory
          </Button>

        </div>
      </CardContent>

      <CardFooter
        className={cn(
          'flex flex-wrap items-center gap-2 pt-0',
          isMobile ? 'flex-col' : 'justify-between'
        )}
      >
        <Button
          asChild
          variant="secondary"
          size={isMobile ? 'default' : 'sm'}
          className={cn('flex-1', isMobile && 'w-full')}
        >
          <Link to={`/agents/${agent.id}`} className="flex items-center justify-center gap-1">
            <Eye className="h-4 w-4" />
            View
          </Link>
        </Button>
        <Button
          variant="outline"
          size={isMobile ? 'default' : 'sm'}
          onClick={() => onEdit(agent.id)}
          className={cn('flex-1', isMobile && 'w-full')}
        >
          <Settings className="h-4 w-4" />
          Configure
        </Button>
        <Button
          variant="secondary"
          size={isMobile ? 'default' : 'sm'}
          onClick={() => onViewMemory(agent.id)}
          className={cn('flex-1', isMobile && 'w-full')}
        >
          <Database className="h-4 w-4" />
          Memory
        </Button>
        <Button
          variant="outline"
          size={isMobile ? 'default' : 'sm'}
          onClick={() => onBuildWorkflow(agent.id)}
          className={cn('flex-1', isMobile && 'w-full')}
        >
          <Workflow className="h-4 w-4" />
          Workflows
        </Button>
      </CardFooter>
    </Card>
  );
};
