import { WS_BASE } from '@/lib/api/config';
import type { ServerEvent } from '@/lib/realtime/events';

const SERVER_EVENT_TYPES: Set<ServerEvent['type']> = new Set([
  'connected',
  'agent.created',
  'agent.updated',
  'agent.deleted',
  'task.created',
  'task.updated',
  'task.deleted',
  'task.stream',
  'memory.created',
  'memory.updated',
  'memory.deleted',
]);

export const resolveWebSocketUrl = (): string => {
  const base = (WS_BASE ?? '').replace(/\/$/, '');

  if (/^wss?:\/\//i.test(base)) {
    return `${base}/ws`;
  }

  if (/^https?:\/\//i.test(base)) {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
    return url.toString();
  }

  if (typeof window !== 'undefined') {
    const origin = new URL(window.location.origin);
    origin.protocol = origin.protocol === 'https:' ? 'wss:' : 'ws:';
    const path = base ? (base.startsWith('/') ? base : `/${base}`) : '';
    origin.pathname = `${path.replace(/\/$/, '')}/ws`;
    return origin.toString();
  }

  return 'ws://localhost:3001/ws';
};

export const normalizeServerEvent = (raw: unknown): ServerEvent | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if ('type' in raw && typeof (raw as { type: unknown }).type === 'string') {
    const type = (raw as { type: string }).type as ServerEvent['type'];
    if (!SERVER_EVENT_TYPES.has(type)) {
      return null;
    }
    if ('data' in raw) {
      return { type, data: (raw as { data: unknown }).data } as ServerEvent;
    }
    return { type } as ServerEvent;
  }

  if ('event' in raw && typeof (raw as { event: unknown }).event === 'string') {
    const legacyType = (raw as { event: string }).event.replace(/:/g, '.') as ServerEvent['type'];
    if (!SERVER_EVENT_TYPES.has(legacyType)) {
      return null;
    }
    const payload = (raw as { payload?: unknown; data?: unknown }).payload ?? (raw as { payload?: unknown; data?: unknown }).data;
    if (legacyType === 'connected') {
      return { type: 'connected' };
    }
    return { type: legacyType, data: payload } as ServerEvent;
  }

  return null;
};
