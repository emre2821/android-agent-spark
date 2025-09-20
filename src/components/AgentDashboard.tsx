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

            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}

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
