import { readBearer, verifySession } from '@/lib/auth'
import { getAgentConfig, isMockAgent, REPORT_FILE_NAME } from '@/lib/config'
import { buildPrompt, pollAgentTask, submitAgentTask } from '@/lib/agent-client'
import { getMockTask, submitMockTask } from '@/lib/mock-agent'
import { jsonErr, jsonOk, handleRouteError } from '@/lib/api-response'
import type { DemoTaskInput } from '@/lib/types'

function cleanInput(raw: unknown): DemoTaskInput | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const query = typeof obj.query === 'string' ? obj.query.trim().slice(0, 2000) : ''
  if (!query) return null
  const scenarioRaw = typeof obj.scenario === 'string' ? obj.scenario : 'generic'
  const scenario =
    scenarioRaw === 'gaokao' || scenarioRaw === 'shopping' ? scenarioRaw : 'generic'
  return { query, scenario }
}

function requireAuth(request: Request) {
  const token = readBearer(request.headers.get('authorization'))
  return verifySession(token)
}

/**
 * POST /api/demo/task
 * 提交 Agent 任务（对应 miniapp POST /miniapp/shopping/task）
 */
export async function POST(request: Request) {
  try {
    requireAuth(request)
    const input = cleanInput(await request.json().catch(() => null))
    if (!input) {
      return jsonErr(400, 'query is required (max 2000 chars)')
    }

    if (isMockAgent()) {
      const { taskId } = submitMockTask(input)
      return jsonOk({
        ok: true,
        status: 'submitted' as const,
        taskId,
        reportFileName: REPORT_FILE_NAME,
        message: 'Mock 任务已提交',
      })
    }

    const config = getAgentConfig()
    if (!config) {
      return jsonErr(500, 'agent config missing')
    }
    const prompt = buildPrompt(input)
    const { taskId } = await submitAgentTask(config, prompt)
    return jsonOk({
      ok: true,
      status: 'submitted' as const,
      taskId,
      reportFileName: REPORT_FILE_NAME,
      message: '任务已提交到 InfiniSynapse',
    })
  } catch (error) {
    return handleRouteError(error)
  }
}

/**
 * GET /api/demo/task?taskId=
 * 轮询任务结果（对应 miniapp GET /miniapp/shopping/task）
 */
export async function GET(request: Request) {
  try {
    requireAuth(request)
    const taskId = new URL(request.url).searchParams.get('taskId')?.trim() || ''
    if (!taskId || taskId.length > 80) {
      return jsonErr(400, 'taskId is required')
    }

    if (isMockAgent()) {
      return jsonOk(getMockTask(taskId))
    }

    const config = getAgentConfig()
    if (!config) {
      return jsonErr(500, 'agent config missing')
    }
    const result = await pollAgentTask(config, taskId)
    return jsonOk(result)
  } catch (error) {
    return handleRouteError(error)
  }
}
