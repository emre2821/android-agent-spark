import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { collaborationClient } from '@/lib/collaboration/collaborationClient';
import { AuditLogEntry } from '@/types/collaboration';

const fetchAuditLog = async (): Promise<AuditLogEntry[]> => {
  const response = await fetch('http://localhost:3001/audit');
  if (!response.ok) {
    throw new Error('Failed to load activity feed');
  }
  return response.json();
};

const actionLabels: Record<string, string> = {
  'lock-acquired': 'Lock acquired',
  'lock-released': 'Lock released',
  'lock-forced': 'Force unlock',
  save: 'Changes saved',
};

const actionVariants: Record<string, 'default' | 'secondary' | 'destructive'> = {
  'lock-acquired': 'secondary',
  'lock-released': 'default',
  'lock-forced': 'destructive',
  save: 'default',
};

interface ActivityFeedProps {
  limit?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ limit = 25 }) => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-log'],
    queryFn: fetchAuditLog,
    staleTime: 10_000,
  });

  useEffect(() => {
    const unsubscribe = collaborationClient.subscribe('audit-entry', (entry) => {
      queryClient.setQueryData<AuditLogEntry[]>(['audit-log'], (previous = []) => {
        const next = [...previous, entry];
        if (next.length > limit) {
          next.splice(0, next.length - limit);
        }
        return next;
      });
    });
    collaborationClient.connect();
    return () => {
      unsubscribe();
    };
  }, [queryClient, limit]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading activity…</p>}
        {error && <p className="text-sm text-destructive">Unable to load activity.</p>}
        {!isLoading && !error && (!data || data.length === 0) && (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        )}
        {data && data.length > 0 && (
          <div className="space-y-4">
            {data
              .slice(-limit)
              .reverse()
              .map((entry) => (
                <div key={entry.id} className="space-y-2 rounded-md border border-border/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={actionVariants[entry.action] ?? 'default'}>
                      {actionLabels[entry.action] ?? entry.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <div className="font-medium text-foreground">
                      {entry.userName ? `${entry.userName}` : 'System'}
                      {entry.resource ? ` • ${entry.resource}` : ''}
                    </div>
                    {entry.details && <p className="text-sm text-muted-foreground">{entry.details}</p>}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
