'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { apiFetch, clearToken, getToken, setToken, ApiError } from '@/lib/client-api'
import type { AgentTaskResult, DemoLoginResponse, DemoProfile } from '@/lib/types'

const POLL_MS = 2_000
const POLL_TIMEOUT_MS = 10 * 60 * 1000

const EXAMPLES: { label: string; scenario: 'generic' | 'gaokao' | 'shopping'; query: string }[] = [
  {
    label: '通用分析',
    scenario: 'generic',
    query: '用三句话说明如何基于 InfiniSynapse 做一个「输入表单 → Agent 分析 → Markdown 报告」的小应用。',
  },
  {
    label: '高考选校（示意）',
    scenario: 'gaokao',
    query: '河南物理类 610 分，位次约 18000，目标西安电子科技大学计算机相关专业，请给冲稳保建议。',
  },
  {
    label: '省钱比价（示意）',
    scenario: 'shopping',
    query: '预算 800 元内想买降噪耳机，通勤用，优先京东/淘宝比价，列出避坑点。',
  },
]

export default function DemoApp() {
  const [name, setName] = useState('demo-user')
  const [profile, setProfile] = useState<DemoProfile | null>(null)
  const [query, setQuery] = useState(EXAMPLES[0].query)
  const [scenario, setScenario] = useState<'generic' | 'gaokao' | 'shopping'>('generic')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AgentTaskResult | null>(null)
  const [error, setError] = useState('')
  const abortRef = useRef(false)

  const refreshProfile = useCallback(async () => {
    if (!getToken()) {
      setProfile(null)
      return
    }
    try {
      const p = await apiFetch<DemoProfile>('/api/auth/profile')
      setProfile(p)
    } catch {
      clearToken()
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  async function onLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const data = await apiFetch<DemoLoginResponse>('/api/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ name }),
      })
      setToken(data.token)
      await refreshProfile()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登录失败')
    }
  }

  function onLogout() {
    clearToken()
    setProfile(null)
    setResult(null)
  }

  async function pollUntilDone(taskId: string) {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    while (Date.now() < deadline && !abortRef.current) {
      await new Promise((r) => setTimeout(r, POLL_MS))
      if (abortRef.current) return
      const data = await apiFetch<AgentTaskResult>(`/api/demo/task?taskId=${encodeURIComponent(taskId)}`)
      setResult(data)
      if (data.status === 'completed' || data.status === 'failed') return
    }
    setError('轮询超时：任务可能仍在后台执行，请到 InfiniSynapse 控制台查看。')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) {
      setError('请先登录')
      return
    }
    setBusy(true)
    setError('')
    setResult(null)
    abortRef.current = false
    try {
      const submitted = await apiFetch<AgentTaskResult>('/api/demo/task', {
        method: 'POST',
        body: JSON.stringify({ query, scenario }),
      })
      setResult(submitted)
      if (submitted.taskId && submitted.status !== 'completed') {
        await pollUntilDone(submitted.taskId)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '提交失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">InfiniSynapse Open Source Starter</p>
        <h1>Web Demo：鉴权 → 提交 Agent → 轮询结果</h1>
        <p className="lead">
          这是从官网「高考选校 / 省钱比价」抽取出的最小接入框架。默认{' '}
          <code>MOCK_AGENT=true</code>，无需密钥即可跑通；接真实底座时只改环境变量。
        </p>
      </header>

      <section className="card">
        <h2>1. 登录（Demo）</h2>
        {profile ? (
          <div className="row">
            <p>
              已登录：<strong>{profile.name}</strong>
              <span className="tag">{profile.mockAgent ? 'Mock Agent' : 'Real Agent'}</span>
            </p>
            <button type="button" className="btn ghost" onClick={onLogout}>
              退出
            </button>
          </div>
        ) : (
          <form className="row" onSubmit={onLogin}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="用户名"
              maxLength={64}
              required
            />
            <button type="submit" className="btn">
              获取会话 Token
            </button>
          </form>
        )}
        <p className="hint">生产请替换为 Authing / OAuth / 微信登录；API Key 只放服务端。</p>
      </section>

      <section className="card">
        <h2>2. 提交任务</h2>
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="chip"
              onClick={() => {
                setScenario(ex.scenario)
                setQuery(ex.query)
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit}>
          <label className="label">
            场景
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as typeof scenario)}
            >
              <option value="generic">generic</option>
              <option value="gaokao">gaokao（示意 Prompt）</option>
              <option value="shopping">shopping（示意 Prompt）</option>
            </select>
          </label>
          <label className="label">
            需求
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={5}
              maxLength={2000}
              required
            />
          </label>
          <button type="submit" className="btn" disabled={busy || !profile}>
            {busy ? '执行中…' : '提交到 Agent'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>3. 结果</h2>
        {error ? <p className="error">{error}</p> : null}
        {result ? (
          <>
            <p className="meta">
              status: <code>{result.status || '-'}</code>
              {result.taskId ? (
                <>
                  {' '}
                  · taskId: <code>{result.taskId}</code>
                </>
              ) : null}
              {result.message ? <> · {result.message}</> : null}
            </p>
            {result.thinkingSteps && result.thinkingSteps.length > 0 ? (
              <ul className="steps">
                {result.thinkingSteps.map((s) => (
                  <li key={s.id}>{s.text}</li>
                ))}
              </ul>
            ) : null}
            {result.resultContent ? (
              <article className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.resultContent}</ReactMarkdown>
              </article>
            ) : (
              <p className="hint">等待报告文件生成…</p>
            )}
          </>
        ) : (
          <p className="hint">提交后这里会展示思考步骤与 Markdown 报告。</p>
        )}
      </section>

      <footer className="footer">
        <p>
          调用链：<code>POST /api/auth/login</code> → <code>POST /api/demo/task</code> →{' '}
          <code>GET /api/demo/task?taskId=</code>
        </p>
        <p>扩展方式见仓库根目录 README。</p>
      </footer>
    </main>
  )
}
