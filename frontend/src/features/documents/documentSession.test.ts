import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, setUnauthorizedHandler } from '@/lib/api'
import { getDelegates, getDocumentAgreements, getDocumentCompanies, getDocumentTemplates, getDocumentVariants, getManualFields, getProvinces } from './documentsApi'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  setUnauthorizedHandler()
  vi.unstubAllGlobals()
})

describe('new document session', () => {
  it('loads every catalog with credentials and keeps the authenticated session', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []))
    vi.stubGlobal('fetch', fetchMock)
    const sessionInvalid = vi.fn()
    setUnauthorizedHandler(sessionInvalid)

    await Promise.all([
      getDocumentTemplates(),
      getDocumentVariants('template-id'),
      getProvinces(),
      getDocumentCompanies(),
      getDelegates(),
      getDocumentAgreements(),
      getManualFields('variant-id'),
    ])

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/templates?active=true',
      '/api/v1/templates/template-id/variants?active=true',
      '/api/v1/provinces',
      '/api/v1/companies?active=true',
      '/api/v1/delegates',
      '/api/v1/agreements?active=true',
      '/api/v1/documents/permiso-gremial/variants/variant-id/manual-fields',
    ])
    expect(fetchMock.mock.calls.every(([, options]) => options.credentials === 'include')).toBe(true)
    expect(sessionInvalid).not.toHaveBeenCalled()
  })

  it.each([403, 404, 500])('does not invalidate the session for catalog error %i', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(status, { code: 'CATALOG_ERROR', message: 'Error de catálogo.' })))
    const sessionInvalid = vi.fn()
    setUnauthorizedHandler(sessionInvalid)

    await expect(getDocumentTemplates()).rejects.toBeInstanceOf(ApiError)

    expect(sessionInvalid).not.toHaveBeenCalled()
  })

  it('invalidates the session only when the backend identifies it as invalid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { code: 'SESSION_INVALID', message: 'La sesión no es válida o expiró.' })))
    const sessionInvalid = vi.fn()
    setUnauthorizedHandler(sessionInvalid)

    await expect(getDocumentTemplates()).rejects.toBeInstanceOf(ApiError)

    expect(sessionInvalid).toHaveBeenCalledOnce()
  })

  it('does not invalidate the session for an unrelated 401 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { code: 'CATALOG_ERROR', message: 'Error de catálogo.' })))
    const sessionInvalid = vi.fn()
    setUnauthorizedHandler(sessionInvalid)

    await expect(getDocumentTemplates()).rejects.toBeInstanceOf(ApiError)

    expect(sessionInvalid).not.toHaveBeenCalled()
  })
})
