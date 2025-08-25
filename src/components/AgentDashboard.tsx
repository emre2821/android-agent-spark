import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentCard } from './AgentCard';
import { CreateAgentDialog } from './CreateAgentDialog';
import { AgentMemoryDialog } from './AgentMemoryDialog';
import { Plus, Search, Settings } from 'lucide-react';

// Mock data for demonstration
const mockAgents = [
  {
    id: '1',
    name: 'Task Automator',
    description: 'Automates daily tasks and workflows with intelligent decision making',
    status: 'active' as const,
    tasksCompleted: 147,
    memoryItems: 23,
    lastActive: '2 minutes ago'
  },
  {
    id: '2', 
    name: 'Data Collector',
    description: 'Gathers and organizes information from multiple sources',
    status: 'learning' as const,
    tasksCompleted: 89,
    memoryItems: 156,
    lastActive: '1 hour ago'
  },
  {
    id: '3',
    name: 'Smart Assistant',
    description: 'Provides intelligent responses and performs complex reasoning',
    status: 'inactive' as const,
    tasksCompleted: 342,
    memoryItems: 89,
    lastActive: '3 days ago'
  }
];

export const AgentDashboard: React.FC = () => {
  const [agents, setAgents] = useState(mockAgents);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgentMemory, setSelectedAgentMemory] = useState<string | null>(null);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateAgent = (agentData: any) => {
    const newAgent = {
      id: Date.now().toString(),
      ...agentData,
      tasksCompleted: 0,
      memoryItems: 0,
      lastActive: 'Just created'
    };
    setAgents([...agents, newAgent]);
    setShowCreateDialog(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AI Agent Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your intelligent automation agents
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-active">
              {agents.filter(a => a.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Agents</div>
          </div>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-task">
              {agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>
          <div className="gradient-card rounded-lg p-4 border border-border/50">
            <div className="text-2xl font-bold text-agent-memory">
              {agents.reduce((sum, agent) => sum + agent.memoryItems, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Memory Items</div>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={(id) => console.log('Edit agent:', id)}
              onViewMemory={(id) => setSelectedAgentMemory(id)}
            />
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No agents found matching your search.</p>
          </div>
        )}
      </div>

      <CreateAgentDialog 
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateAgent}
      />

      <AgentMemoryDialog
        open={selectedAgentMemory !== null}
        onClose={() => setSelectedAgentMemory(null)}
        agentId={selectedAgentMemory || ''}
      />
    </div>
  );
};