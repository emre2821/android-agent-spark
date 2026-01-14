import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { clearWorkflows, getCachedWorkflows, isCacheExpired, persistWorkflows } from '../offline-storage'
import type { StoredWorkflow } from '@/types/workflow'

vi.mock('idb-keyval', () => {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  }
})

const buildWorkflow = (overrides: Partial<StoredWorkflow> = {}): StoredWorkflow => ({
  id: 'wf-1',
  name: 'Test Flow',
  description: 'Demo workflow',
  createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  steps: [],
  ...overrides,
})

describe('offline storage helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    Object.assign(globalThis, { indexedDB: {} })
    vi.mocked(idbGet).mockReset()
    vi.mocked(idbSet).mockReset()
    vi.mocked(idbDel).mockReset()
  })

  afterEach(() => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB
  })

  it('returns workflows from IndexedDB when available', async () => {
    const workflows = [buildWorkflow({ id: 'wf-indexed' })]
    vi.mocked(idbGet).mockResolvedValueOnce(JSON.stringify(workflows))

    const result = await getCachedWorkflows()

    expect(idbGet).toHaveBeenCalledWith('android-agent-spark:workflows')
    expect(result).toEqual(workflows)
  })

  it('falls back to localStorage when IndexedDB is unavailable or empty', async () => {
    delete (globalThis as { indexedDB?: IDBFactory }).indexedDB
    const workflows = [buildWorkflow({ id: 'wf-local' })]
    window.localStorage.setItem('android-agent-spark:workflows', JSON.stringify(workflows))

    const result = await getCachedWorkflows()

    expect(idbGet).not.toHaveBeenCalled()
    expect(result).toEqual(workflows)
  })

  it('persists workflows to both IndexedDB and localStorage', async () => {
    const workflows = [buildWorkflow({ id: 'wf-save' })]
    vi.mocked(idbSet).mockResolvedValueOnce()

    await persistWorkflows(workflows)

    expect(idbSet).toHaveBeenCalledWith('android-agent-spark:workflows', JSON.stringify(workflows))
    expect(window.localStorage.getItem('android-agent-spark:workflows')).toEqual(JSON.stringify(workflows))
  })

  it('clears stored workflows from both IndexedDB and localStorage', async () => {
    vi.mocked(idbDel).mockResolvedValueOnce()
    window.localStorage.setItem('android-agent-spark:workflows', 'cache')

    await clearWorkflows()

    expect(idbDel).toHaveBeenCalledWith('android-agent-spark:workflows')
    expect(window.localStorage.getItem('android-agent-spark:workflows')).toBeNull()
  })

  describe('isCacheExpired', () => {
    it('treats non-positive ttl as expired', () => {
      expect(isCacheExpired(Date.now(), 0)).toBe(true)
      expect(isCacheExpired(Date.now(), -1)).toBe(true)
    })

    it('treats invalid timestamps as expired', () => {
      expect(isCacheExpired(Number.NaN, 1000)).toBe(true)
      expect(isCacheExpired(-1, 1000)).toBe(true)
    })

    it('compares the provided timestamp with ttl', () => {
      const now = Date.now()
      expect(isCacheExpired(now - 500, 1000, now)).toBe(false)
      expect(isCacheExpired(now - 1500, 1000, now)).toBe(true)
    })
  })
})
