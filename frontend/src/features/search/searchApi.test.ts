import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchGlobal } from './searchApi'

afterEach(() => vi.unstubAllGlobals())

describe('global search API', () => {
  it('encodes the query and requests the aggregate search endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ documents: [], companies: [], delegates: [], agreements: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await searchGlobal('Ana Pérez')

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/search?q=Ana%20P%C3%A9rez', expect.objectContaining({ credentials: 'include' }))
  })
})
