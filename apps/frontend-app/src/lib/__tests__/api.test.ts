import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../api'

type FetchResponse = {
  ok: boolean
  text: () => Promise<string>
}

const buildResponse = (text = ''): FetchResponse => ({
  ok: true,
  text: vi.fn().mockResolvedValue(text),
})

describe('apiRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stringifies falsy JSON body values', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse())
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/test', { method: 'POST', body: 0 })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Headers

    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init.body).toBe('0')
  })

  it('stringifies boolean body values', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse())
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/test', { method: 'POST', body: false })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Headers

    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init.body).toBe('false')
  })
})
