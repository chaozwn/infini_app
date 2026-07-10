'use client'

const TOKEN_KEY = 'infini_demo_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  code: number
  constructor(message: string, code: number) {
    super(message)
    this.code = code
  }
}

type Envelope<T> = { code: number; data: T; message: string }

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (init.auth !== false) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(path, { ...init, headers, cache: 'no-store' })
  const json = (await res.json().catch(() => null)) as Envelope<T> | null
  if (!res.ok || !json || json.code !== 200) {
    throw new ApiError(json?.message || `HTTP ${res.status}`, json?.code || res.status)
  }
  return json.data
}
