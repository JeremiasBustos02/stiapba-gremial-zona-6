import { afterEach, describe, expect, it, vi } from 'vitest'
import { generatePermisoGremial } from './documentsApi'

afterEach(() => vi.unstubAllGlobals())

describe('document generation API', () => {
  it('gets CSRF and sends the complete generation request', async () => {
    const request = {
      provinceId: 'province',
      issueDate: '2026-09-10',
      companyId: 'company',
      delegateId: 'delegate',
      permitDay: 10,
      agreementId: 'agreement',
      variantId: 'variant',
      manualValues: { note: 'value' },
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Blob(['pdf'], { type: 'application/pdf' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const pdf = await generatePermisoGremial(request)

    expect(pdf.type).toBe('application/pdf')
    expect(fetchMock.mock.calls[1]).toEqual([
      '/api/v1/documents/permiso-gremial/generate',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(request),
      }),
    ])
    expect(fetchMock.mock.calls[1][1].headers.get('X-XSRF-TOKEN')).toBe('csrf-token')
  })
})
