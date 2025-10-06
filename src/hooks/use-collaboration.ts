import { useCallback, useEffect, useMemo, useState } from 'react';
import { collaborationClient, CollaborationConflictError } from '@/lib/collaboration/collaborationClient';
import { LockState, PresenceUser } from '@/types/collaboration';

interface UseCollaborationResult {
  presence: PresenceUser[];
  lock: LockState | null;
  isLockedByCurrentUser: boolean;
  isLockedByAnother: boolean;
  conflictMessage: string | null;
  conflictLock: LockState | null;
  requestLock: (metadata?: Record<string, unknown>) => Promise<{ ok: boolean; lock?: LockState | null; message?: string }>;
  releaseLock: (metadata?: Record<string, unknown>) => Promise<{ ok: boolean }>;
  forceUnlock: (reason?: string) => Promise<{ ok: boolean; lock?: LockState | null }>;
  saveChanges: (summary: string, metadata?: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;
  clearConflict: () => void;
}

interface UseCollaborationOptions {
  resourceId: string | null;
  user: { id: string; name: string; color?: string } | null;
}

const defaultResult: UseCollaborationResult = {
  presence: [],
  lock: null,
  isLockedByCurrentUser: false,
  isLockedByAnother: false,
  conflictMessage: null,
  conflictLock: null,
  async requestLock() {
    return { ok: false };
  },
  async releaseLock() {
    return { ok: false };
  },
  async forceUnlock() {
    return { ok: false };
  },
  async saveChanges() {
    return { ok: false };
  },
  clearConflict() {},
};

export const useCollaboration = ({ resourceId, user }: UseCollaborationOptions): UseCollaborationResult => {
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [lock, setLock] = useState<LockState | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [conflictLock, setConflictLock] = useState<LockState | null>(null);

  useEffect(() => {
    if (!resourceId || !user) {
      setPresence([]);
      setLock(null);
      setConflictMessage(null);
      setConflictLock(null);
    }
  }, [resourceId, user]);

  useEffect(() => {
    if (!resourceId || !user) return;

    const unsubscribePresence = collaborationClient.subscribe('presence-update', ({ resource, users }) => {
      if (resource !== resourceId) return;
      setPresence(users.map((u) => ({ ...u, isCurrentUser: u.id === user.id })));
    });

    const unsubscribeLock = collaborationClient.subscribe('lock-update', ({ resource, lock: lockUpdate }) => {
      if (resource !== resourceId) return;
      setLock(lockUpdate);
      if (lockUpdate?.userId === user.id) {
        setConflictMessage(null);
        setConflictLock(null);
      }
    });

    const unsubscribeConflict = collaborationClient.subscribe('conflict', ({ resource, message, lock: lockState }) => {
      if (resource !== resourceId) return;
      setConflictMessage(message);
      setConflictLock(lockState);
    });

    collaborationClient.connect();
    collaborationClient.joinResource(resourceId, user);

    return () => {
      unsubscribePresence();
      unsubscribeLock();
      unsubscribeConflict();
      collaborationClient.leaveResource(resourceId, user.id);
    };
  }, [resourceId, user]);

  const requestLock = useCallback<UseCollaborationResult['requestLock']>(
    async (metadata) => {
      if (!resourceId || !user) return { ok: false };
      try {
        const response = await collaborationClient.lockResource(resourceId, user, metadata);
        if (response?.lock) {
          setLock(response.lock as LockState);
        }
        setConflictMessage(null);
        setConflictLock(null);
        return { ok: true, lock: (response?.lock ?? null) as LockState | null };
      } catch (error) {
        if (error instanceof CollaborationConflictError) {
          setConflictMessage(error.message);
          setConflictLock(error.lock);
          return { ok: false, message: error.message, lock: error.lock };
        }
        throw error;
      }
    },
    [resourceId, user],
  );

  const releaseLock = useCallback<UseCollaborationResult['releaseLock']>(
    async (metadata) => {
      if (!resourceId || !user) return { ok: false };
      try {
        await collaborationClient.unlockResource(resourceId, user.id, metadata);
        setLock(null);
        return { ok: true };
      } catch (error) {
        if (error instanceof CollaborationConflictError) {
          setConflictMessage(error.message);
          setConflictLock(error.lock);
          return { ok: false };
        }
        throw error;
      }
    },
    [resourceId, user],
  );

  const forceUnlock = useCallback<UseCollaborationResult['forceUnlock']>(
    async (reason) => {
      if (!resourceId || !user) return { ok: false };
      try {
        const response = await collaborationClient.forceUnlockResource(resourceId, user, { reason });
        if (response?.lock) {
          setLock(response.lock as LockState);
        }
        setConflictMessage(null);
        setConflictLock(null);
        return { ok: true, lock: (response?.lock ?? null) as LockState | null };
      } catch (error) {
        if (error instanceof CollaborationConflictError) {
          setConflictMessage(error.message);
          setConflictLock(error.lock);
          return { ok: false, lock: error.lock };
        }
        throw error;
      }
    },
    [resourceId, user],
  );

  const saveChanges = useCallback<UseCollaborationResult['saveChanges']>(
    async (summary, metadata) => {
      if (!resourceId || !user) return { ok: false };
      try {
        await collaborationClient.saveResource(resourceId, user, summary, metadata);
        setConflictMessage(null);
        setConflictLock(null);
        return { ok: true };
      } catch (error) {
        if (error instanceof CollaborationConflictError) {
          setConflictMessage(error.message);
          setConflictLock(error.lock);
          return { ok: false, message: error.message };
        }
        throw error;
      }
    },
    [resourceId, user],
  );

  const clearConflict = useCallback(() => {
    setConflictMessage(null);
    setConflictLock(null);
  }, []);

  const result = useMemo<UseCollaborationResult>(() => {
    if (!resourceId || !user) {
      return defaultResult;
    }
    return {
      presence,
      lock,
      isLockedByCurrentUser: Boolean(lock && lock.userId === user.id),
      isLockedByAnother: Boolean(lock && lock.userId !== user.id),
      conflictMessage,
      conflictLock,
      requestLock,
      releaseLock,
      forceUnlock,
      saveChanges,
      clearConflict,
    };
  }, [resourceId, user, presence, lock, conflictMessage, conflictLock, requestLock, releaseLock, forceUnlock, saveChanges, clearConflict]);

  return result;
};
