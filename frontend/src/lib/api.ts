/// <reference types="vite/client" />

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

type ApiErrorBody = {
  message?: string
  errors?: Record<string, string>
}

type ApiRequestOptions = RequestInit & {
  notifyUnauthorized?: boolean
}

let unauthorizedHandler: (() => void) | undefined

export function setUnauthorizedHandler(handler?: () => void) {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? 'No pudimos completar la operación.')
    this.status = status
    this.fields = body.errors ?? {}
  }
}

function csrfToken() {
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.slice('XSRF-TOKEN='.length)
}

export async function apiRequest<T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> {
  const response = await apiResponse(path, requestOptions)

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function apiRequestBlob(path: string, requestOptions: ApiRequestOptions = {}): Promise<Blob> {
  const response = await apiResponse(path, requestOptions)
  return response.blob()
}

async function apiResponse(path: string, requestOptions: ApiRequestOptions): Promise<Response> {
  const { notifyUnauthorized = true, ...options } = requestOptions
  const method = options.method?.toUpperCase() ?? 'GET'
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = csrfToken()
    if (token) headers.set('X-XSRF-TOKEN', decodeURIComponent(token))
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      // The status still provides a useful fallback message.
    }
    const error = new ApiError(response.status, body)
    if (response.status === 401 && notifyUnauthorized) unauthorizedHandler?.()
    throw error
  }

  return response
}
