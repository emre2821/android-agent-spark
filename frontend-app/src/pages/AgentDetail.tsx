import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAgents } from '@/hooks/use-agents';
import { formatDistanceToNow } from 'date-fns';

const AgentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { agents, agentsMap } = useAgents();

  const sanitizedId = (id ?? '').trim();
  const isValidId = sanitizedId.length > 0 && /^[a-zA-Z0-9-_]+$/.test(sanitizedId);

  const agent = isValidId ? agentsMap.get(sanitizedId) : undefined;
  const totalAgents = agents.length;

  useEffect(() => {
    if (!isValidId) {
      return;
    }

    if (!agent) {
      console.error(`Agent not found for ID: ${sanitizedId}. Available agents: ${totalAgents}`);
    }
  }, [agent, isValidId, sanitizedId, totalAgents]);

  if (!isValidId) {
    return (
      <div className="p-6">
        <p className="mb-4">Invalid agent ID.</p>
        <Button asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6">
        <p className="mb-4">Agent not found.</p>
        <Button asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">{agent.name}</h1>
        <p className="text-muted-foreground">{agent.description}</p>
        <div className="space-y-2">
          <div>Status: {agent.status}</div>
          <div>Tasks completed: {agent.tasksCompleted}</div>
          <div>Memory items: {agent.memoryItems}</div>
          <div>
            Last active:{' '}
            {formatDistanceToNow(new Date(agent.lastActive), { addSuffix: true })}
          </div>
        </div>
        <Button asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default AgentDetail;
