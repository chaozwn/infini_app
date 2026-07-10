import { randomUUID } from 'crypto'
import type { AgentTaskResult, DemoTaskInput } from './types'
import { REPORT_FILE_NAME } from './config'

type MockTask = {
  taskId: string
  createdAt: number
  query: string
  scenario: string
  status: 'submitted' | 'running' | 'completed'
  resultContent?: string
  thinkingSteps: { id: string; text: string }[]
}

/** 进程内任务表：仅用于本地 Demo，不适合多实例生产部署 */
const store = new Map<string, MockTask>()

const MOCK_DELAY_MS = 4_000

function buildMockReport(input: DemoTaskInput): string {
  const scenario = input.scenario || 'generic'
  const title =
    scenario === 'gaokao'
      ? '高考选校分析（Mock）'
      : scenario === 'shopping'
        ? '省钱比价报告（Mock）'
        : 'Demo Agent 报告（Mock）'

  return `# ${title}

> 本报告由 **MOCK_AGENT=true** 生成，未调用真实 InfiniSynapse。
> 将 \`.env.local\` 中 \`MOCK_AGENT\` 设为 \`false\` 并配置 \`INFINISYNAPSE_API_KEY\` 即可走真实 Agent。

## 你的输入

\`\`\`
${input.query}
\`\`\`

## 结论（示例）

- 这是一条可运行的参考链路：登录 → 提交任务 → 轮询 → 展示 Markdown。
- 真实场景下，Agent 会连接你的**数据源 / RAG / 浏览器插件**，并在任务工作区写出 \`${REPORT_FILE_NAME}\`。

## 下一步

1. 阅读仓库根目录 README 的「扩展步骤」
2. 把 \`buildPrompt\` 换成你的业务 Prompt（参考官网高考 / 购物应用）
3. 按需启用 Database / RAG / Browser 能力
`
}

export function submitMockTask(input: DemoTaskInput): { taskId: string } {
  const taskId = randomUUID()
  const task: MockTask = {
    taskId,
    createdAt: Date.now(),
    query: input.query,
    scenario: input.scenario || 'generic',
    status: 'submitted',
    thinkingSteps: [{ id: '1', text: '已接收任务，正在分析需求…' }],
  }
  store.set(taskId, task)

  // 模拟异步执行
  setTimeout(() => {
    const t = store.get(taskId)
    if (!t) return
    t.status = 'running'
    t.thinkingSteps.push({ id: '2', text: '正在检索相关信息（Mock）…' })
  }, 800)

  setTimeout(() => {
    const t = store.get(taskId)
    if (!t) return
    t.status = 'completed'
    t.thinkingSteps.push({ id: '3', text: '已生成 Markdown 报告（Mock）' })
    t.resultContent = buildMockReport(input)
  }, MOCK_DELAY_MS)

  return { taskId }
}

export function getMockTask(taskId: string): AgentTaskResult {
  const task = store.get(taskId)
  if (!task) {
    return { ok: false, error: 'task not found' }
  }
  if (task.status === 'completed') {
    return {
      ok: true,
      status: 'completed',
      taskId,
      resultContent: task.resultContent,
      resultSource: 'mock',
      reportFileName: REPORT_FILE_NAME,
      thinkingSteps: task.thinkingSteps,
      message: 'Mock 任务已完成',
    }
  }
  return {
    ok: true,
    status: task.status === 'running' ? 'running' : 'submitted',
    taskId,
    thinkingSteps: task.thinkingSteps,
    message: '任务执行中（Mock）',
    reportFileName: REPORT_FILE_NAME,
  }
}
