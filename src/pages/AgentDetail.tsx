import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAgents } from '@/hooks/use-agents';

const AgentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { agents } = useAgents();
  const agent = agents.find((a) => a.id === id);

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
          <div>Last active: {agent.lastActive}</div>
        </div>
        <Button asChild>
          <Link to="/">Back</Link>
        </Button>
      </div>
    </div>
  );
};

export default AgentDetail;
