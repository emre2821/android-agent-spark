import { del, get, set } from 'idb-keyval'
import type { StoredWorkflow } from '@/types/workflow'

const WORKFLOW_CACHE_KEY = 'android-agent-spark:workflows'

const hasIndexedDbSupport = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return typeof indexedDB !== 'undefined'
  } catch (error) {
    console.warn('[offline-storage] IndexedDB detection failed', error)
    return false
  }
}

const hasLocalStorageSupport = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return typeof window.localStorage !== 'undefined'
  } catch (error) {
    console.warn('[offline-storage] localStorage detection failed', error)
    return false
  }
}

const deserializeWorkflows = (
  raw: string | null | undefined
): StoredWorkflow[] | null => {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as StoredWorkflow[]
  } catch (error) {
    console.warn('[offline-storage] Failed to parse cached workflows', error)
    return null
  }
}

export const getCachedWorkflows = async (): Promise<StoredWorkflow[] | null> => {
  if (hasIndexedDbSupport()) {
    try {
      const serialized = await get<string>(WORKFLOW_CACHE_KEY)
      return deserializeWorkflows(serialized)
    } catch (error) {
      console.warn('[offline-storage] Failed to read workflows from IndexedDB', error)
      return null
    }
  }

  if (hasLocalStorageSupport()) {
    try {
      const serialized = window.localStorage.getItem(WORKFLOW_CACHE_KEY)
      return deserializeWorkflows(serialized)
    } catch (error) {
      console.warn('[offline-storage] Failed to read workflows from localStorage', error)
      return null
    }
  }

  return null
}

export const persistWorkflows = async (
  workflows: StoredWorkflow[]
): Promise<void> => {
  const serialized = JSON.stringify(workflows)

  if (hasIndexedDbSupport()) {
    try {
      await set(WORKFLOW_CACHE_KEY, serialized)
      return
    } catch (error) {
      console.warn('[offline-storage] Failed to write workflows to IndexedDB', error)
    }
  }

  if (hasLocalStorageSupport()) {
    try {
      window.localStorage.setItem(WORKFLOW_CACHE_KEY, serialized)
    } catch (error) {
      console.warn('[offline-storage] Failed to write workflows to localStorage', error)
    }
  }
}

export const clearWorkflows = async (): Promise<void> => {
  if (hasIndexedDbSupport()) {
    try {
      await del(WORKFLOW_CACHE_KEY)
    } catch (error) {
      console.warn('[offline-storage] Failed to clear workflows from IndexedDB', error)
    }
  }

  if (hasLocalStorageSupport()) {
    try {
      window.localStorage.removeItem(WORKFLOW_CACHE_KEY)
    } catch (error) {
      console.warn('[offline-storage] Failed to clear workflows from localStorage', error)
    }
  }
}

export const isCacheExpired = (
  cachedAt: number,
  ttlMs: number,
  now: number = Date.now()
): boolean => {
  if (ttlMs <= 0) {
    return true
  }

  return now - cachedAt >= ttlMs
}
