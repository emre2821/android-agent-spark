import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { del, get, set } from 'idb-keyval'
import type { Agent } from '@/types/agent'
import type { StoredWorkflow } from '@/types/workflow'

const NAMESPACE = 'agent-dashboard'
const memoryStore = new Map<string, string>()

const buildKey = (key: string) => `${NAMESPACE}:${key}`

const isBrowser = typeof window !== 'undefined'

const isNativePlatform = () => {
  if (!isBrowser) return false
  try {
    return Capacitor.isNativePlatform?.() ?? Capacitor.getPlatform() !== 'web'
  } catch (error) {
    console.warn('Capacitor platform detection failed; assuming web runtime.', error)
    return false
  }
}

const persistWithPreferences = async (key: string, value: unknown) => {
  const serialised = JSON.stringify(value)
  await Preferences.set({ key: buildKey(key), value: serialised })
}

const readFromPreferences = async <T>(key: string): Promise<T | null> => {
  const result = await Preferences.get({ key: buildKey(key) })
  if (!result.value) return null
  try {
    return JSON.parse(result.value) as T
  } catch (error) {
    console.warn('Failed to parse cached preferences payload', error)
    return null
  }
}

const persistWithIndexedDb = async (key: string, value: unknown) => {
  const serialised = JSON.stringify(value)
  await set(buildKey(key), serialised)
}

const readFromIndexedDb = async <T>(key: string): Promise<T | null> => {
  const stored = await get<string | undefined>(buildKey(key))
  if (!stored) return null
  try {
    return JSON.parse(stored) as T
  } catch (error) {
    console.warn('Failed to parse cached IndexedDB payload', error)
    return null
  }
}

const removeFromIndexedDb = (key: string) => del(buildKey(key))

const removeFromPreferences = (key: string) => Preferences.remove({ key: buildKey(key) })

const persistInMemory = (key: string, value: unknown) => {
  memoryStore.set(buildKey(key), JSON.stringify(value))
}

const readFromMemory = <T>(key: string): T | null => {
  const stored = memoryStore.get(buildKey(key))
  if (!stored) return null
  try {
    return JSON.parse(stored) as T
  } catch (error) {
    console.warn('Failed to parse cached memory payload', error)
    return null
  }
}

const removeFromMemory = (key: string) => {
  memoryStore.delete(buildKey(key))
}

const persist = async (key: string, value: unknown) => {
  if (isNativePlatform()) {
    await persistWithPreferences(key, value)
    return
  }

  if (isBrowser) {
    await persistWithIndexedDb(key, value)
    return
  }

  persistInMemory(key, value)
}

const read = async <T>(key: string): Promise<T | null> => {
  if (isNativePlatform()) {
    return readFromPreferences<T>(key)
  }

  if (isBrowser) {
    return readFromIndexedDb<T>(key)
  }

  return readFromMemory<T>(key)
}

const remove = async (key: string) => {
  if (isNativePlatform()) {
    await removeFromPreferences(key)
    return
  }

  if (isBrowser) {
    await removeFromIndexedDb(key)
    return
  }

  removeFromMemory(key)
}

const AGENT_CACHE_KEY = 'agents'
const WORKFLOW_CACHE_KEY = 'workflows'

export const getCachedAgents = async (): Promise<Agent[] | null> => read<Agent[]>(AGENT_CACHE_KEY)

export const persistAgents = (agents: Agent[]) => persist(AGENT_CACHE_KEY, agents)

export const clearAgentCache = () => remove(AGENT_CACHE_KEY)

export const getCachedWorkflows = async (): Promise<StoredWorkflow[] | null> =>
  read<StoredWorkflow[]>(WORKFLOW_CACHE_KEY)

export const persistWorkflows = (workflows: StoredWorkflow[]) => persist(WORKFLOW_CACHE_KEY, workflows)

export const clearWorkflowCache = () => remove(WORKFLOW_CACHE_KEY)
