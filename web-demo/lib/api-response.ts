import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ code: 200, data, message: 'ok' }, init)
}

export function jsonErr(status: number, message: string, code = status) {
  return NextResponse.json({ code, data: null, message }, { status })
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonErr(401, error.message, 401)
  }
  const message = error instanceof Error ? error.message : 'internal error'
  console.error('[web-demo]', message)
  return jsonErr(500, message)
}
