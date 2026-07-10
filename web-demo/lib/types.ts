/** 统一任务结果形状（精简自官网 AgentTaskResult） */
export type TaskStatus = 'submitted' | 'running' | 'completed' | 'failed'

export type AgentTaskResult = {
  ok: boolean
  status?: TaskStatus
  taskId?: string
  message?: string
  resultContent?: string
  resultSource?: 'markdown_file' | 'mock' | 'last_message'
  reportFileName?: string
  thinkingSteps?: { id: string; text: string }[]
  error?: string
}

export type DemoLoginResponse = {
  token: string
  account: { id: string; name: string }
}

export type DemoProfile = {
  id: string
  name: string
  mockAgent: boolean
}

export type DemoTaskInput = {
  /** 用户自然语言需求，对应官网各小应用的表单拼装结果 */
  query: string
  /** 可选：业务标签，便于扩展成高考 / 购物等场景 */
  scenario?: 'generic' | 'gaokao' | 'shopping'
}
