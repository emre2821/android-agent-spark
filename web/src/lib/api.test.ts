import type { AxiosAdapter } from "axios";
import { AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type StorageState = Record<string, string>;

const createStorageMock = (initial: StorageState = {}): Storage => {
  const store = new Map<string, string>();
  Object.entries(initial).forEach(([key, value]) => {
    store.set(key, value);
  });

  return {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => {
      store.clear();
    }),
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  } as Storage;
};

describe("api client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).localStorage;
    delete (globalThis as Record<string, unknown>).sessionStorage;
    delete (globalThis as Record<string, unknown>).agentSparkSettings;
    delete (globalThis as Record<string, unknown>).AGENT_SPARK_API_KEY;
    delete (globalThis as Record<string, unknown>).__AGENT_SPARK_API_KEY__;
    delete (globalThis as Record<string, unknown>).__AGENT_SPARK_ENV__;
    vi.clearAllMocks();
  });

  it("prefers the API key from runtime settings", async () => {
    (globalThis as Record<string, unknown>).agentSparkSettings = { apiKey: "settings-key " };
    (globalThis as Record<string, unknown>).localStorage = createStorageMock({
      "agentSpark.apiKey": "stored-key",
    });

    const { applyApiKeyHeader, API_KEY_HEADER } = await import("./api");
    const config = applyApiKeyHeader({ headers: undefined } as any);
    const headers = config.headers as AxiosHeaders;

    expect(headers.get(API_KEY_HEADER)).toBe("settings-key");
  });

  it("falls back to stored API keys when no runtime setting is present", async () => {
    (globalThis as Record<string, unknown>).localStorage = createStorageMock({
      "agentSpark.apiKey": "stored-key",
    });

    const { applyApiKeyHeader, API_KEY_HEADER } = await import("./api");
    const config = applyApiKeyHeader({ headers: undefined } as any);
    const headers = config.headers as AxiosHeaders;

    expect(headers.get(API_KEY_HEADER)).toBe("stored-key");
  });

  it("does not overwrite an explicitly provided API key header", async () => {
    (globalThis as Record<string, unknown>).localStorage = createStorageMock({
      "agentSpark.apiKey": "stored-key",
    });

    const { applyApiKeyHeader, API_KEY_HEADER } = await import("./api");
    const initialHeaders = AxiosHeaders.from({ [API_KEY_HEADER]: "existing" });
    const config = applyApiKeyHeader({ headers: initialHeaders } as any);
    const headers = config.headers as AxiosHeaders;

    expect(headers.get(API_KEY_HEADER)).toBe("existing");
  });

  it("injects the API key into outgoing requests", async () => {
    (globalThis as Record<string, unknown>).localStorage = createStorageMock({
      "agentSpark.apiKey": "stored-key",
    });

    const { api, API_KEY_HEADER } = await import("./api");
    const adapter = vi.fn(async (requestConfig) => ({
      config: requestConfig,
      data: {},
      headers: {},
      status: 200,
      statusText: "OK",
    }));

    api.defaults.adapter = adapter as AxiosAdapter;
    await api.get("/test");

    expect(adapter).toHaveBeenCalledTimes(1);
    const requestConfig = adapter.mock.calls[0][0];
    const headers = requestConfig.headers as AxiosHeaders;

    expect(headers.get(API_KEY_HEADER)).toBe("stored-key");
  });
});
