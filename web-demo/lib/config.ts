/**
 * 服务端配置。密钥只读 process.env，绝不下发到浏览器。
 */

function env(name: string, fallback = ''): string {
  return (process.env[name] || fallback).trim()
}

export function isMockAgent(): boolean {
  const raw = env('MOCK_AGENT', 'true').toLowerCase()
  return raw !== 'false' && raw !== '0'
}

export function getDemoJwtSecret(): string {
  const secret = env('DEMO_JWT_SECRET')
  if (secret) return secret
  if (isMockAgent()) return 'dev-only-change-me-before-production'
  throw new Error('DEMO_JWT_SECRET is required when MOCK_AGENT=false')
}

export function getAgentConfig() {
  if (isMockAgent()) {
    return null
  }
  const apiKey = env('INFINISYNAPSE_API_KEY')
  const server = env('INFINISYNAPSE_SERVER')
  if (!apiKey || apiKey.includes('your-api-key')) {
    throw new Error('INFINISYNAPSE_API_KEY is required when MOCK_AGENT=false')
  }
  if (!server) {
    throw new Error('INFINISYNAPSE_SERVER is required when MOCK_AGENT=false')
  }
  return {
    apiKey,
    server: server.replace(/\/$/, ''),
    language: env('INFINISYNAPSE_LANG', 'zh_CN') || 'zh_CN',
  }
}

export const REPORT_FILE_NAME = 'demo-agent-result.md'
export const POLL_INTERVAL_MS = 3_000
export const POLL_TIMEOUT_MS = 30 * 60 * 1000
