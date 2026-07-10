import { issueSession } from '@/lib/auth'
import { jsonErr, jsonOk, handleRouteError } from '@/lib/api-response'

/**
 * POST /api/auth/login
 * 极简 Demo 登录：任意非空用户名即可拿到会话 token。
 * 生产请替换为 Authing / OAuth / 微信登录等正式方案。
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { name?: string }
    const name = (body.name || '').trim().slice(0, 64)
    if (!name) {
      return jsonErr(400, 'name is required')
    }
    const token = issueSession(name)
    return jsonOk({
      token,
      account: { id: `demo-${name}`, name },
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
