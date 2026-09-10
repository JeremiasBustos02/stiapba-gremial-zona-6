import { afterEach, describe, expect, it, vi } from 'vitest'
import { generatePermisoGremial, getDocumentHistory, regenerateDocument, sendDocumentEmail } from './documentsApi'

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
      .mockResolvedValueOnce(new Response(new Blob(['pdf'], { type: 'application/pdf' }), { status: 200, headers: {
        'Content-Disposition': 'inline; filename="pg-2026-000001_permiso-gremial_ana-paz.pdf"',
        'X-Document-Id': 'record-1', 'X-Public-Number': 'PG-2026-000001',
      } }))
    vi.stubGlobal('fetch', fetchMock)

    const document = await generatePermisoGremial(request)

    expect(document.blob.type).toBe('application/pdf')
    expect(document).toMatchObject({ documentId: 'record-1', publicNumber: 'PG-2026-000001', filename: 'pg-2026-000001_permiso-gremial_ana-paz.pdf' })
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

  it('requests the selected history page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await getDocumentHistory(2)

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/documents/history?page=2&size=20', expect.objectContaining({ credentials: 'include' }))
  })

  it('returns the regenerated PDF and its response headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(['pdf'], { type: 'application/pdf' }), {
      status: 200,
      headers: { 'Content-Disposition': 'inline; filename="pg-2026-000001_permiso-gremial_ana-paz.pdf"' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await regenerateDocument('record-1')

    expect(result.blob.type).toBe('application/pdf')
    expect(result.headers.get('Content-Disposition')).toContain('pg-2026-000001')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/documents/history/record-1/pdf', expect.objectContaining({ credentials: 'include' }))
  })

  it('gets CSRF and sends the recipient to the document email endpoint', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Correo enviado correctamente.' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendDocumentEmail('record-1', 'persona@example.com')

    expect(fetchMock.mock.calls[1]).toEqual(['/api/v1/documents/history/record-1/email', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ recipient: 'persona@example.com' }), credentials: 'include',
    })])
    expect(fetchMock.mock.calls[1][1].headers.get('X-XSRF-TOKEN')).toBe('csrf-token')
  })
})
