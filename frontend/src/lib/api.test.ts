import { describe, expect, it } from 'vitest'
import { resolveApiBaseUrl } from './api'

describe('resolveApiBaseUrl', () => {
  it('uses the same-origin API path in production and development', () => {
    expect(resolveApiBaseUrl()).toBe('/api/v1')
    expect(resolveApiBaseUrl('/api/v1/')).toBe('/api/v1')
  })

  it.each([
    'https://jere-stiapba-2026.onrender.com/api/v1',
    '//jere-stiapba-2026.onrender.com/api/v1',
  ])('rejects a URL that would bypass the same-origin proxy: %s', (url) => {
    expect(() => resolveApiBaseUrl(url)).toThrow('VITE_API_URL debe ser una ruta relativa al mismo origen.')
  })
})
