import { LockState, PresenceUser, AuditLogEntry } from '@/types/collaboration';

export type CollaborationEventMap = {
  'presence-update': { resource: string; users: PresenceUser[] };
  'lock-update': { resource: string; lock: LockState | null };
  conflict: { resource: string; message: string; lock: LockState | null };
  'audit-entry': AuditLogEntry;
  connected: void;
  disconnected: void;
  error: { message: string };
};

type EventKey = keyof CollaborationEventMap;

type Listener<T> = (payload: T) => void;

interface PresenceUpdateMessage {
  type: 'presence-update';
  resource: string;
  users: PresenceUser[];
}

interface LockUpdateMessage {
  type: 'lock-update';
  resource: string;
  lock: LockState | null;
}

interface ConflictMessage {
  type: 'conflict';
  resource: string;
  message: string;
  lock: LockState | null;
  ackId?: string;
}

interface AckMessage {
  type: 'ack';
  resource: string;
  ackId: string;
  status: string;
  lock?: LockState | null;
}

interface AuditEntryMessage {
  type: 'audit-entry';
  entry: AuditLogEntry;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type ServerMessage =
  | PresenceUpdateMessage
  | LockUpdateMessage
  | ConflictMessage
  | AckMessage
  | AuditEntryMessage
  | ErrorMessage;

type JoinMessage = {
  type: 'join';
  resource: string;
  userId: string;
  userName: string;
  color?: string;
};

type LeaveMessage = {
  type: 'leave';
  resource: string;
  userId: string;
};

type AckClientMessage =
  | {
      type: 'lock';
      resource: string;
      userId: string;
      userName: string;
      metadata?: Record<string, unknown>;
      ackId?: string;
    }
  | {
      type: 'unlock';
      resource: string;
      userId: string;
      metadata?: Record<string, unknown>;
      ackId?: string;
    }
  | {
      type: 'force-unlock';
      resource: string;
      userId: string;
      userName: string;
      metadata?: Record<string, unknown>;
      ackId?: string;
    }
  | {
      type: 'save';
      resource: string;
      userId: string;
      userName: string;
      summary: string;
      metadata?: Record<string, unknown>;
      ackId?: string;
    };

type ClientMessage = JoinMessage | LeaveMessage | AckClientMessage;

interface PendingRequest {
  resolve: (value: AckMessage | ConflictMessage) => void;
  reject: (reason: Error) => void;
  timeout?: ReturnType<typeof setTimeout>;
}

export class CollaborationConflictError extends Error {
  lock: LockState | null;
  resource: string;

  constructor(resource: string, message: string, lock: LockState | null) {
    super(message);
    this.name = 'CollaborationConflictError';
    this.resource = resource;
    this.lock = lock;
  }
}

const WS_URL = import.meta.env.VITE_COLLAB_URL ?? 'ws://localhost:3001';
const ACK_TIMEOUT = 5000;

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export class CollaborationClient {
  private socket: WebSocket | null = null;
  private listeners: Partial<{ [K in EventKey]: Set<Listener<CollaborationEventMap[K]>> }> = {};
  private pending: Map<string, PendingRequest> = new Map();
  private queue: { message: ClientMessage; onSent?: () => void }[] = [];
  private shouldReconnect = false;
  private reconnectDelay = 1000;

  connect() {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.shouldReconnect = true;
    this.createSocket();
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private createSocket() {
    if (typeof window === 'undefined') return;
    try {
      const ws = new window.WebSocket(WS_URL.replace(/^http/, 'ws'));
      this.socket = ws;

      ws.onopen = () => {
        this.reconnectDelay = 1000;
        this.flushQueue();
        this.emit('connected', undefined);
      };

      ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      ws.onerror = () => {
        this.emit('error', { message: 'Collaboration connection error' });
      };

      ws.onclose = () => {
        this.emit('disconnected', undefined);
        this.socket = null;
        if (!this.shouldReconnect) return;
        const delay = this.reconnectDelay;
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
        window.setTimeout(() => this.createSocket(), delay);
      };
    } catch (err) {
      console.error('Failed to establish collaboration socket', err);
    }
  }

  private flushQueue() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    while (this.queue.length > 0) {
      const queued = this.queue.shift();
      if (!queued) continue;
      const { message, onSent } = queued;
      this.socket.send(JSON.stringify(message));
      onSent?.();
    }
  }

  private send(message: ClientMessage, onSent?: () => void) {
    if (typeof window === 'undefined') return;
    this.connect();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      onSent?.();
    } else {
      this.queue.push({ message, onSent });
    }
  }

  private sendWithAck(message: AckClientMessage): Promise<AckMessage> {
    if (!message.ackId) {
      message.ackId = generateId();
    }
    const ackId = message.ackId as string;
    return new Promise((resolve, reject) => {
      const pending: PendingRequest = { resolve, reject };
      const startTimeout = () => {
        if (pending.timeout) return;
        pending.timeout = setTimeout(() => {
          this.pending.delete(ackId);
          reject(new Error('Request timed out'));
        }, ACK_TIMEOUT);
      };
      this.pending.set(ackId, pending);
      this.send(message, startTimeout);
    });
  }

  private completeRequest(ackId: string, payload: AckMessage | ConflictMessage, error?: CollaborationConflictError | Error) {
    const pending = this.pending.get(ackId);
    if (!pending) return;
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }
    this.pending.delete(ackId);
    if (error) {
      pending.reject(error);
    } else {
      pending.resolve(payload);
    }
  }

  private handleMessage(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error('Invalid message from collaboration server', err);
      return;
    }

    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return;
    }

    const message = parsed as ServerMessage;

    switch (message.type) {
      case 'presence-update': {
        this.emit('presence-update', {
          resource: message.resource,
          users: (message.users || []) as PresenceUser[],
        });
        break;
      }
      case 'lock-update': {
        this.emit('lock-update', {
          resource: message.resource,
          lock: (message.lock ?? null) as LockState | null,
        });
        break;
      }
      case 'audit-entry': {
        this.emit('audit-entry', message.entry as AuditLogEntry);
        break;
      }
      case 'conflict': {
        const conflictError = new CollaborationConflictError(
          message.resource,
          message.message,
          (message.lock ?? null) as LockState | null,
        );
        if (message.ackId) {
          this.completeRequest(message.ackId, message, conflictError);
        }
        this.emit('conflict', {
          resource: message.resource,
          message: message.message,
          lock: (message.lock ?? null) as LockState | null,
        });
        break;
      }
      case 'ack': {
        if (message.ackId) {
          this.completeRequest(message.ackId, message);
        }
        break;
      }
      case 'error': {
        this.emit('error', { message: message.message });
        break;
      }
      default:
        break;
    }
  }

  subscribe<K extends EventKey>(event: K, listener: Listener<CollaborationEventMap[K]>) {
    const listeners = (this.listeners[event] ??= new Set());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        delete this.listeners[event];
      }
    };
  }

  private emit<K extends EventKey>(event: K, payload: CollaborationEventMap[K]) {
    const listeners = this.listeners[event];
    if (!listeners) return;
    listeners.forEach((listener) => {
      listener(payload);
    });
  }

  joinResource(resource: string, user: { id: string; name: string; color?: string }) {
    const message: JoinMessage = {
      type: 'join',
      resource,
      userId: user.id,
      userName: user.name,
      color: user.color,
    };
    this.send(message);
  }

  leaveResource(resource: string, userId: string) {
    const message: LeaveMessage = {
      type: 'leave',
      resource,
      userId,
    };
    this.send(message);
  }

  lockResource(resource: string, user: { id: string; name: string }, metadata?: Record<string, unknown>) {
    const message: AckClientMessage = {
      type: 'lock',
      resource,
      userId: user.id,
      userName: user.name,
      metadata,
    };
    return this.sendWithAck(message);
  }

  unlockResource(resource: string, userId: string, metadata?: Record<string, unknown>) {
    const message: AckClientMessage = {
      type: 'unlock',
      resource,
      userId,
      metadata,
    };
    return this.sendWithAck(message);
  }

  forceUnlockResource(
    resource: string,
    user: { id: string; name: string },
    metadata?: Record<string, unknown>,
  ) {
    const message: AckClientMessage = {
      type: 'force-unlock',
      resource,
      userId: user.id,
      userName: user.name,
      metadata,
    };
    return this.sendWithAck(message);
  }

  saveResource(
    resource: string,
    user: { id: string; name: string },
    summary: string,
    metadata?: Record<string, unknown>,
  ) {
    const message: AckClientMessage = {
      type: 'save',
      resource,
      userId: user.id,
      userName: user.name,
      summary,
      metadata,
    };
    return this.sendWithAck(message);
  }
}

export const collaborationClient = new CollaborationClient();
