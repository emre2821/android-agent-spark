import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Database, Zap, Settings, Eye, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { Agent } from '@/hooks/use-agents';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agentId: string) => void;
  onViewMemory: (agentId: string) => void;
  onBuildWorkflow: (agentId: string) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onEdit,
  onViewMemory,
  onBuildWorkflow,
}) => {
  const isMobile = useIsMobile();

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return 'bg-agent-active/20 text-agent-active border-agent-active/30';
      case 'inactive':
        return 'bg-agent-inactive/20 text-agent-inactive border-agent-inactive/30';
      case 'learning':
        return 'bg-agent-memory/20 text-agent-memory border-agent-memory/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="agent-card border-border/50 hover:border-primary/30 group transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{agent.name}</CardTitle>
          </div>
          <Badge className={getStatusColor(agent.status)}>{agent.status}</Badge>
        </div>
        <CardDescription className="text-muted-foreground">
          {agent.description || 'No description provided'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className={cn(
            'grid grid-cols-2 gap-4 text-sm',
            isMobile && 'grid-cols-1 gap-3'
          )}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-agent-task" />
            <span className="text-muted-foreground">Tasks:</span>
            <span className="font-medium text-foreground">{agent.tasksCompleted}</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-agent-memory" />
            <span className="text-muted-foreground">Memory:</span>
            <span className="font-medium text-foreground">{agent.memoryItems}</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">Last active: {agent.lastActive}</div>
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

