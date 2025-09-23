import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Database, Eye, Settings, Workflow, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types/agent';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agentId: string) => void;
  onViewMemory: (agentId: string) => void;
  onBuildWorkflow: (agentId: string) => void;
}

const statusColorMap: Record<Agent['status'], string> = {
  active: 'bg-agent-active/20 text-agent-active border-agent-active/30',
  inactive: 'bg-agent-inactive/20 text-agent-inactive border-agent-inactive/30',
  learning: 'bg-agent-memory/20 text-agent-memory border-agent-memory/30',
};

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

  return (
    <Card className="agent-card border-border/50 hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{agent.name}</CardTitle>
          </div>
          <Badge className={statusColor}>{agent.status}</Badge>
        </div>
        <CardDescription className="text-muted-foreground">
          {agent.description}
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

        <div className="text-xs text-muted-foreground">Last active: {agent.lastActive}</div>

        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            isMobile ? 'flex-col' : 'justify-between'
          )}
        >
          <Button
            variant="ghost"
            size={actionButtonSize}
            className={cn('px-3', isMobile && 'w-full justify-center')}
            asChild
          >
            <Link to={`/agents/${agent.id}`} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>

          <Button
            variant="outline"
            size={actionButtonSize}
            onClick={() => onEdit(agent.id)}
            className={cn(isMobile && 'w-full justify-center')}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configure
          </Button>

          <Button
            variant="secondary"
            size={actionButtonSize}
            onClick={() => onViewMemory(agent.id)}
            className={cn(isMobile && 'w-full justify-center')}
          >
            <Database className="h-4 w-4 mr-1" />
            Memory
          </Button>

          <Button
            variant="outline"
            size={actionButtonSize}
            onClick={() => onBuildWorkflow?.(agent.id)}
            className={cn('flex-1', isMobile && 'w-full justify-center')}
          >
            <Workflow className="h-4 w-4 mr-1" />
            Workflows
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
