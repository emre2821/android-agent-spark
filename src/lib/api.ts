import { API_BASE } from '@/hooks/use-agents';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type RequestResult<T> = { data?: T } & Record<string, unknown>;

type RequestInitWithBody = RequestInit & { body?: JsonValue | BodyInit | null };

export async function apiRequest<T = unknown>(path: string, init: RequestInitWithBody = {}) {
  const headers = new Headers(init.headers ?? {});
  let body = init.body;
  if (body && typeof body !== 'string' && !(body instanceof FormData) && !(body instanceof Blob)) {
    headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: body as BodyInit | null | undefined,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'string'
        ? data
        : typeof data === 'object' && data !== null && 'message' in (data as Record<string, unknown>)
        ? ((data as Record<string, unknown>).message as string | undefined)
        : undefined;
    throw new Error(message || 'Request failed');
  }

  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return ((data as RequestResult<T>).data ?? data) as T;
  }

  return data as T;
}
