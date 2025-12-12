import { getStoredAuthToken, getStoredWorkspaceId } from '@/lib/auth/storage';
import { parseResponseText, extractErrorMessage } from '@/lib/utils/fetch';

export const withAuthContext = (init?: RequestInit): RequestInit => {
  const headers = new Headers(init?.headers ?? {});

  const token = getStoredAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const workspaceId = getStoredWorkspaceId();
  if (workspaceId && !headers.has('X-Workspace-Id')) {
    headers.set('X-Workspace-Id', workspaceId);
  }

  if (init) {
    return { ...init, headers };
  }

  return { headers };
};

export const fetchJson = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, withAuthContext(init));
  const text = await response.text();

  if (!response.ok) {
    const data = parseResponseText(text);
    const message = extractErrorMessage(data, response.statusText);
    throw new Error(message);
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};
