import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { del, get, set } from 'idb-keyval';
import type { Agent } from '@/types/agent';

const AGENT_CACHE_KEY = 'agents-cache';
const AGENT_PENDING_KEY = 'agents-pending';

export interface CachedAgentsPayload {
  agents: Agent[];
  updatedAt: string;
}

const isNativePlatform = () => {
  try {
    return Capacitor.isNativePlatform?.() ?? Capacitor.getPlatform() !== 'web';
  } catch (error) {
    console.warn('Unable to determine Capacitor platform, assuming web.', error);
    return false;
  }
};

const writePayload = async (key: string, payload: CachedAgentsPayload | null) => {
  if (payload === null) {
    if (isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      await del(key);
    }
    return;
  }

  if (isNativePlatform()) {
    await Preferences.set({ key, value: JSON.stringify(payload) });
  } else {
    await set(key, payload);
  }
};

const readPayload = async (key: string): Promise<CachedAgentsPayload | null> => {
  if (isNativePlatform()) {
    const result = await Preferences.get({ key });
    if (!result.value) return null;

    try {
      return JSON.parse(result.value) as CachedAgentsPayload;
    } catch (error) {
      console.error('Failed to parse cached payload from Capacitor Preferences', error);
      await Preferences.remove({ key });
      return null;
    }
  }

  const payload = await get<CachedAgentsPayload | undefined>(key);
  return payload ?? null;
};

export const cacheAgents = async (agents: Agent[]): Promise<CachedAgentsPayload> => {
  const payload: CachedAgentsPayload = {
    agents,
    updatedAt: new Date().toISOString(),
  };
  await writePayload(AGENT_CACHE_KEY, payload);
  return payload;
};

export const loadCachedAgents = async (): Promise<CachedAgentsPayload | null> => {
  return readPayload(AGENT_CACHE_KEY);
};

export const cachePendingAgents = async (agents: Agent[]): Promise<CachedAgentsPayload | null> => {
  if (!agents.length) {
    await writePayload(AGENT_PENDING_KEY, null);
    return null;
  }

  const payload: CachedAgentsPayload = {
    agents,
    updatedAt: new Date().toISOString(),
  };
  await writePayload(AGENT_PENDING_KEY, payload);
  return payload;
};

export const loadPendingAgents = async (): Promise<CachedAgentsPayload | null> => {
  return readPayload(AGENT_PENDING_KEY);
};

export const clearPendingAgents = async () => {
  await writePayload(AGENT_PENDING_KEY, null);
};
