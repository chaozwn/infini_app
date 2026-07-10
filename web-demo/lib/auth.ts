import { createHmac, timingSafeEqual } from 'crypto'
import { getDemoJwtSecret } from './config'

export type SessionPayload = {
  sub: string
  name: string
  iat: number
  exp: number
}

const SESSION_TTL_SEC = 7 * 24 * 60 * 60

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(normalized, 'base64')
}

function sign(body: string): string {
  return createHmac('sha256', getDemoJwtSecret()).update(body).digest('base64url')
}

/** 签发 Demo 会话 token（仅示例，生产请换正式 IdP / Authing / OAuth） */
export function issueSession(name: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    sub: `demo-${b64url(name).slice(0, 12)}`,
    name: name.slice(0, 64) || 'demo-user',
    iat: now,
    exp: now + SESSION_TTL_SEC,
  }
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

export function verifySession(token: string): SessionPayload {
  const parts = token.split('.')
  if (parts.length !== 2) throw new AuthError('invalid token format')
  const [body, sig] = parts
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AuthError('invalid token signature')
  }
  let payload: SessionPayload
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload
  } catch {
    throw new AuthError('invalid token payload')
  }
  if (!payload?.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AuthError('token expired')
  }
  return payload
}

export function readBearer(authorization: string | null): string {
  const raw = (authorization || '').trim()
  if (!raw.toLowerCase().startsWith('bearer ')) {
    throw new AuthError('missing bearer token')
  }
  const token = raw.slice(7).trim()
  if (!token) throw new AuthError('empty bearer token')
  return token
}

export class AuthError extends Error {
  status = 401
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}
