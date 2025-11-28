import { API_BASE } from '@/lib/api/config';
import { parseResponseText, extractErrorMessage } from './utils/fetch';

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
  const data = parseResponseText(text);

  if (!response.ok) {
    const message = extractErrorMessage(data);
    throw new Error(message);
  }

  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return ((data as RequestResult<T>).data ?? data) as T;
  }

  return data as T;
}
