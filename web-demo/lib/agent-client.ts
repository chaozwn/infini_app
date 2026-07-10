/**
 * InfiniSynapse Agent 最小客户端
 * 精简自 infini-proxy miniapp/shopping.util.ts 与官网 submit 链路：
 *   POST /api/ai/message  (type: newTask)
 *   GET  /api/ai_task/getUiMessageById
 *   POST /api/ai_task/previewFile
 *   GET  /api/ai_task/getTaskWorkspace/:taskId
 */

import { randomUUID } from 'crypto'
import { REPORT_FILE_NAME } from './config'
import type { AgentTaskResult, DemoTaskInput } from './types'

export type AgentConfig = {
  server: string
  apiKey: string
  language: string
}

function bearer(token: string): string {
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`
}

function headers(config: AgentConfig) {
  return {
    Authorization: bearer(config.apiKey),
    'Content-Type': 'application/json',
    'x-lang': config.language,
  }
}

async function decodeApiResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`InfiniSynapse HTTP ${response.status}: ${text.slice(0, 300)}`)
  }
  try {
    const parsed = JSON.parse(text) as { code?: number; message?: string; data?: unknown }
    if (typeof parsed.code === 'number' && parsed.code !== 200) {
      throw new Error(`InfiniSynapse API ${parsed.code}: ${parsed.message || 'unknown error'}`)
    }
    return parsed.data ?? parsed
  } catch (error) {
    if (error instanceof SyntaxError) return text
    throw error
  }
}

/** 把业务输入拼成 Agent Prompt（示例：可按场景扩展） */
export function buildPrompt(input: DemoTaskInput): string {
  const scenario = input.scenario || 'generic'
  const hint =
    scenario === 'gaokao'
      ? '你是高考志愿选校助手。根据用户分数/位次与目标院校，给出冲稳保建议，并写入 Markdown 报告。'
      : scenario === 'shopping'
        ? '你是省钱比价助手。根据用户购物需求给出比价结论与避坑建议，并写入 Markdown 报告。'
        : '你是 InfiniSynapse Demo Agent。完成用户请求，并写入 Markdown 报告。'

  return `${hint}

用户需求：
${input.query}

结果文件要求：
1. 必须在任务工作区根目录生成 Markdown 文件：${REPORT_FILE_NAME}
2. 报告需包含：结论、依据、下一步建议。
3. 直接开始执行，不要只做空泛介绍。`
}

export async function submitAgentTask(
  config: AgentConfig,
  prompt: string,
): Promise<{ taskId: string; connId: string }> {
  const connId = randomUUID()
  const taskId = randomUUID()

  const postResponse = await fetch(`${config.server}/api/ai/message`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({
      type: 'newTask',
      taskId,
      text: prompt,
      images: [],
      connId,
      autoApprovalSettings: {
        enabled: true,
        actions: {
          useMcp: true,
          useSandbox: true,
          useRag: true,
          useDatabase: true,
        },
        maxRequests: 40,
        maxSubAgentRequests: 4,
        enableNotifications: true,
        enableWebSearch: true,
        enableReadImage: true,
        // Demo 默认不开浏览器；购物场景可在扩展时改为 true
        enableBrowser: false,
      },
      chatSettings: { mode: 'act' },
    }),
    cache: 'no-store',
  })

  const postData = (await decodeApiResponse(postResponse)) as {
    success?: boolean
    error?: string
    notification?: { title?: string; message?: string }
  }

  if (postData && typeof postData === 'object' && postData.success === false) {
    const note = postData.notification
    const msg = note
      ? [note.title, note.message].filter(Boolean).join('：')
      : postData.error || '任务提交被拒绝'
    throw new Error(msg)
  }

  return { taskId, connId }
}

async function previewTaskFile(
  config: AgentConfig,
  taskId: string,
  fileName: string,
): Promise<string> {
  const response = await fetch(`${config.server}/api/ai_task/previewFile`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({ taskId, fileName }),
    cache: 'no-store',
  })
  const data = await decodeApiResponse(response)
  if (data && typeof data === 'object' && 'content' in data && typeof (data as { content: unknown }).content === 'string') {
    return (data as { content: string }).content
  }
  return ''
}

async function fetchWorkspaceFiles(config: AgentConfig, taskId: string): Promise<string[]> {
  const response = await fetch(
    `${config.server}/api/ai_task/getTaskWorkspace/${encodeURIComponent(taskId)}`,
    { headers: headers(config), cache: 'no-store' },
  )
  const data = await decodeApiResponse(response)
  if (data && typeof data === 'object' && 'files' in data && Array.isArray((data as { files: unknown }).files)) {
    return ((data as { files: unknown[] }).files).filter((i): i is string => typeof i === 'string')
  }
  return []
}

async function fetchUiMessages(config: AgentConfig, taskId: string): Promise<unknown[]> {
  const response = await fetch(
    `${config.server}/api/ai_task/getUiMessageById?id=${encodeURIComponent(taskId)}`,
    { headers: headers(config), cache: 'no-store' },
  )
  const data = await decodeApiResponse(response)
  return Array.isArray(data) ? data : []
}

function visibleText(value?: string): string {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  if (trimmed.includes('[Tool]') || trimmed.includes('<task_plan>')) return ''
  return trimmed.slice(0, 500)
}

function buildThinkingSteps(messages: unknown[], limit = 12) {
  const steps: { id: string; text: string }[] = []
  for (let i = 0; i < messages.length; i++) {
    const item = messages[i] as { partial?: boolean; text?: string; ts?: number } | null
    if (!item || typeof item !== 'object' || item.partial === true) continue
    if (typeof item.text !== 'string') continue
    const text = visibleText(item.text)
    if (!text) continue
    steps.push({ id: typeof item.ts === 'number' ? `t${item.ts}` : `i${i}`, text })
  }
  return steps.slice(-limit)
}

/** 轮询：优先读约定报告文件，否则看消息是否结束 */
export async function pollAgentTask(config: AgentConfig, taskId: string): Promise<AgentTaskResult> {
  const messages = await fetchUiMessages(config, taskId).catch(() => [])
  const thinkingSteps = buildThinkingSteps(messages)

  const files = await fetchWorkspaceFiles(config, taskId).catch(() => [])
  const hasReport = files.some((f) => f === REPORT_FILE_NAME || f.endsWith(`/${REPORT_FILE_NAME}`))

  if (hasReport) {
    const content = await previewTaskFile(config, taskId, REPORT_FILE_NAME)
    if (content.trim()) {
      return {
        ok: true,
        status: 'completed',
        taskId,
        resultContent: content,
        resultSource: 'markdown_file',
        reportFileName: REPORT_FILE_NAME,
        thinkingSteps,
        message: '任务已完成',
      }
    }
  }

  // 粗略判断：最后一条非 partial ask 表示等待用户
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as { type?: string; partial?: boolean } | null
    if (m && m.partial !== true && m.type === 'ask') {
      return {
        ok: true,
        status: 'running',
        taskId,
        thinkingSteps,
        message: 'Agent 等待用户确认（请到 InfiniSynapse 控制台继续）',
        reportFileName: REPORT_FILE_NAME,
      }
    }
  }

  return {
    ok: true,
    status: 'running',
    taskId,
    thinkingSteps,
    message: '任务执行中…',
    reportFileName: REPORT_FILE_NAME,
  }
}
