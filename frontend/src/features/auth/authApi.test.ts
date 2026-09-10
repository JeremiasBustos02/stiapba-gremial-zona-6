import { afterEach, describe, expect, it, vi } from 'vitest'
import { changeFirstLoginPassword, changePassword, login, logout } from './authApi'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('auth API', () => {
  it('sends login credentials without requesting CSRF first', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { user: { id: 'user-1' } }))
    vi.stubGlobal('fetch', fetchMock)

    await login('12345678', 'password')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ dni: '12345678', password: 'password' }),
    }))
    expect(fetchMock.mock.calls[0][1].headers.get('X-XSRF-TOKEN')).toBeNull()
  })

  it('gets CSRF before changing the password, including first-login changes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: 'csrf-token' }))
      .mockResolvedValueOnce(jsonResponse(200, { message: 'Contraseña actualizada.' }))
      .mockResolvedValueOnce(jsonResponse(200, { token: 'csrf-token' }))
      .mockResolvedValueOnce(jsonResponse(200, { message: 'Contraseña actualizada.' }))
    vi.stubGlobal('fetch', fetchMock)

    await changePassword({ currentPassword: 'current', newPassword: 'new-password', confirmPassword: 'new-password' })
    await changeFirstLoginPassword({ newPassword: 'new-password', confirmPassword: 'new-password' })

    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/change-password')
    expect(fetchMock.mock.calls[1][1].headers.get('X-XSRF-TOKEN')).toBe('csrf-token')
    expect(fetchMock.mock.calls[3][0]).toBe('/api/v1/auth/first-login/change-password')
    expect(fetchMock.mock.calls[3][1].headers.get('X-XSRF-TOKEN')).toBe('csrf-token')
  })

  it('logs out through the authenticated API', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: 'csrf-token' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await logout()

    expect(fetchMock.mock.calls[1]).toEqual([
      '/api/v1/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    ])
    expect(fetchMock.mock.calls[1][1].headers.get('X-XSRF-TOKEN')).toBe('csrf-token')
  })
})
