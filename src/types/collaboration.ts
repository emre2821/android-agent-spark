export interface PresenceUser {
  id: string;
  name: string;
  color?: string;
  lastActive: string;
  isCurrentUser?: boolean;
}

export interface LockState {
  resource: string;
  userId: string;
  userName: string;
  lockedAt: string;
  metadata?: Record<string, unknown>;
  forced?: boolean;
  reason?: string;
  previousOwnerId?: string | null;
  previousOwnerName?: string | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  userId?: string;
  userName?: string;
  details?: string;
  metadata?: Record<string, unknown> | null;
}
