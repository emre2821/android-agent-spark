import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_BASE ?? "/api";

export const API_KEY_HEADER = "X-API-Key";

const API_KEY_STORAGE_KEYS = [
  "agentSpark.apiKey",
  "agent-spark-api-key",
  "agentSparkApiKey",
  "agent_spark_api_key",
] as const;

type AgentSparkSettings = {
  apiKey?: string | null;
};

type AgentSparkGlobalScope = typeof globalThis & {
  agentSparkSettings?: AgentSparkSettings;
  AGENT_SPARK_API_KEY?: string | null;
  agentSparkApiKey?: string | null;
  __AGENT_SPARK_API_KEY__?: string | null;
  __AGENT_SPARK_ENV__?: { VITE_AGENT_SPARK_API_KEY?: string | null };
  localStorage?: Storage;
  sessionStorage?: Storage;
};

const normalize = (value?: string | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const readFromStorage = (storage?: Storage): string | null => {
  if (!storage) {
    return null;
  }

  for (const key of API_KEY_STORAGE_KEYS) {
    try {
      const value = storage.getItem(key);
      const normalized = normalize(value);
      if (normalized) {
        return normalized;
      }
    } catch {
      continue;
    }
  }

  return null;
};

const readEnvironmentApiKey = (globalScope: AgentSparkGlobalScope): string | null => {
  const fromImport = normalize((import.meta.env?.VITE_AGENT_SPARK_API_KEY as string | undefined) ?? null);
  if (fromImport) {
    return fromImport;
  }

  const fromGlobalEnv = normalize(globalScope.__AGENT_SPARK_ENV__?.VITE_AGENT_SPARK_API_KEY ?? null);
  if (fromGlobalEnv) {
    return fromGlobalEnv;
  }

  return null;
};

export const resolveConfiguredApiKey = (): string | null => {
  const globalScope = globalThis as AgentSparkGlobalScope;

  const fromSettings = normalize(globalScope.agentSparkSettings?.apiKey ?? null);
  if (fromSettings) {
    return fromSettings;
  }

  try {
    const fromLocalStorage = readFromStorage(globalScope.localStorage);
    if (fromLocalStorage) {
      return fromLocalStorage;
    }
  } catch {
    // Accessing storage can throw in some browsers (e.g., Safari private mode)
  }

  try {
    const fromSessionStorage = readFromStorage(globalScope.sessionStorage);
    if (fromSessionStorage) {
      return fromSessionStorage;
    }
  } catch {
    // Accessing storage can throw in some browsers (e.g., Safari private mode)
  }

  const globalCandidates = [
    normalize(globalScope.AGENT_SPARK_API_KEY ?? null),
    normalize(globalScope.agentSparkApiKey ?? null),
    normalize(globalScope.__AGENT_SPARK_API_KEY__ ?? null),
  ];

  for (const candidate of globalCandidates) {
    if (candidate) {
      return candidate;
    }
  }

  return readEnvironmentApiKey(globalScope);
};

export const applyApiKeyHeader = <T extends InternalAxiosRequestConfig>(config: T): T => {
  const headers = AxiosHeaders.from(config.headers ?? {});

  if (!headers.has(API_KEY_HEADER)) {
    const apiKey = resolveConfiguredApiKey();
    if (apiKey) {
      headers.set(API_KEY_HEADER, apiKey);
    }
  }

  config.headers = headers;
  return config;
};

export const api = axios.create({ baseURL });

api.interceptors.request.use(applyApiKeyHeader);
