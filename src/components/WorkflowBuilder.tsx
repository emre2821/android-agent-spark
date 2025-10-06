import { useEffect, useMemo, useState } from 'react';
import { Users, Lock, Unlock, Zap, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCollaboration } from '@/hooks/use-collaboration';
import { useToast } from '@/hooks/use-toast';
import { PresenceUser } from '@/types/collaboration';

interface WorkflowBuilderProps {
  resourceId: string;
  initialDescription?: string;
  onSave?: (description: string) => void;
}

const formatPresence = (user: PresenceUser, index: number) => {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      key={`${user.id}-${index}`}
      className="flex items-center gap-2 rounded-full border border-border px-3 py-1"
      style={{ backgroundColor: user.isCurrentUser ? 'rgba(37, 99, 235, 0.08)' : 'transparent' }}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: user.color || '#2563eb' }}
      >
        {initials}
      </span>
      <span className="text-sm font-medium text-foreground">{user.isCurrentUser ? 'You' : user.name}</span>
    </div>
  );
};

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  resourceId,
  initialDescription = '',
  onSave,
}) => {
  const user = useCurrentUser();
  const [description, setDescription] = useState(initialDescription);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setDescription(initialDescription);
  }, [initialDescription]);

  const collaboration = useCollaboration({ resourceId, user });
  const { isLockedByCurrentUser, releaseLock } = collaboration;

  useEffect(() => {
    return () => {
      if (isLockedByCurrentUser) {
        releaseLock({ reason: 'Workflow builder closed' });
      }
    };
  }, [isLockedByCurrentUser, releaseLock]);

  const activePresence = useMemo(() => collaboration.presence, [collaboration.presence]);

  if (!user) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        Loading your collaboration profile...
      </div>
    );
  }

  const handleRequestLock = async () => {
    const result = await collaboration.requestLock({ reason: 'Editing workflow blueprint' });
    if (!result.ok) {
      toast({
        title: 'Unable to acquire lock',
        description: result.message || 'Another collaborator is editing this workflow.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Lock acquired', description: 'You now control workflow edits.' });
    }
  };

  const handleReleaseLock = async () => {
    const result = await collaboration.releaseLock({ reason: 'Finished editing workflow' });
    if (result.ok) {
      toast({ title: 'Lock released', description: 'Others can now edit the workflow.' });
    }
  };

  const handleForceUnlock = async () => {
    const reason = window.prompt('Provide a reason for force unlocking this workflow.');
    if (reason === null) return;
    const result = await collaboration.forceUnlock(reason || 'Force unlock requested');
    if (result.ok) {
      toast({ title: 'Lock overridden', description: 'You have taken control of the workflow.' });
    }
  };

  const handleSave = async () => {
    if (collaboration.isLockedByAnother) {
      toast({
        title: 'Locked by another collaborator',
        description: 'Request control or ask them to release the lock before saving.',
        variant: 'destructive',
      });
      return;
    }

    if (!collaboration.isLockedByCurrentUser) {
      const lockAttempt = await collaboration.requestLock({ reason: 'Saving workflow changes' });
      if (!lockAttempt.ok) {
        toast({
          title: 'Could not acquire lock',
          description: lockAttempt.message || 'Try again after the current editor finishes.',
          variant: 'destructive',
        });
        return;
      }
    }

    const result = await collaboration.saveChanges('Workflow blueprint updated', {
      summaryLength: description.length,
    });

    if (result.ok) {
      onSave?.(description);
      const savedAt = new Date().toISOString();
      setLastSaved(savedAt);
      toast({ title: 'Workflow saved', description: 'Changes have been recorded in the activity feed.' });
    } else {
      toast({
        title: 'Save conflict detected',
        description: result.message || 'Another collaborator saved conflicting changes.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="font-medium text-foreground">Active collaborators</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activePresence.length === 0 && (
              <Badge variant="outline">You are the first one here</Badge>
            )}
            {activePresence.map(formatPresence)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {collaboration.isLockedByCurrentUser ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            You hold the lock
          </Badge>
        ) : collaboration.isLockedByAnother ? (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            Locked by {collaboration.lock?.userName}
          </Badge>
        ) : (
          <Badge variant="outline" className="flex items-center gap-1">
            <Unlock className="h-3.5 w-3.5" />
            Available for editing
          </Badge>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!collaboration.isLockedByCurrentUser && (
            <Button variant="outline" size="sm" onClick={handleRequestLock}>
              <Lock className="mr-2 h-4 w-4" />
              Request control
            </Button>
          )}
          {collaboration.isLockedByCurrentUser && (
            <Button variant="outline" size="sm" onClick={handleReleaseLock}>
              <Unlock className="mr-2 h-4 w-4" />
              Release lock
            </Button>
          )}
          {collaboration.isLockedByAnother && (
            <Button variant="destructive" size="sm" onClick={handleForceUnlock}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Force unlock
            </Button>
          )}
        </div>
      </div>

      {collaboration.conflictMessage && (
        <Alert variant="destructive">
          <AlertTitle>Save conflict detected</AlertTitle>
          <AlertDescription>
            {collaboration.conflictMessage}
            {collaboration.conflictLock && (
              <span className="block text-xs text-muted-foreground">
                Current lock owner: {collaboration.conflictLock.userName}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Zap className="h-4 w-4 text-primary" />
          Workflow blueprint description
        </label>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the workflow steps, triggers, and automation goals..."
          className="min-h-[180px]"
        />
        {lastSaved && (
          <p className="text-xs text-muted-foreground">Last saved at {new Date(lastSaved).toLocaleTimeString()}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setDescription(initialDescription)}>
          Reset
        </Button>
        <Button onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
};
