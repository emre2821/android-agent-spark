const DEFAULT_API_BASE = 'http://localhost:3001';

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '');

const rawBase = (import.meta.env.VITE_API_URL as string | undefined) ?? DEFAULT_API_BASE;

export const API_BASE = normalizeBaseUrl(rawBase);

export const WS_BASE = API_BASE.replace(/^https?:\/\//i, (protocol) =>
  protocol.toLowerCase() === 'https://' ? 'wss://' : 'ws://'
);

export const buildApiUrl = (path: string) => {
  if (!path) {
    return API_BASE;
  }
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
};
