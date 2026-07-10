import { readBearer, verifySession } from '@/lib/auth'
import { isMockAgent } from '@/lib/config'
import { jsonOk, handleRouteError } from '@/lib/api-response'

/**
 * GET /api/auth/profile
 * 校验 Bearer token，返回当前 Demo 用户信息。
 */
export async function GET(request: Request) {
  try {
    const token = readBearer(request.headers.get('authorization'))
    const session = verifySession(token)
    return jsonOk({
      id: session.sub,
      name: session.name,
      mockAgent: isMockAgent(),
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
