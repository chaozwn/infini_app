import { BASE_URL, TOKEN_KEY, USER_KEY } from '../config'

interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
}

function handleAuthFailure() {
  console.warn('[auth] 收到登录失效(code:800)，清除 token，下次 ensureAuth 时静默重新匿名登录')
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USER_KEY)
}

export function request<T>(options: RequestOptions): Promise<T> {
  const token = wx.getStorageSync(TOKEN_KEY) as string

  return new Promise<T>((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: res => {
        const body = res.data as ApiResponse<T>
        // NestJS 对 POST 默认返回 201，这里放宽到 2xx
        const httpOk = res.statusCode >= 200 && res.statusCode < 300
        if (httpOk && body && body.code === 200) {
          resolve(body.data)
          return
        }
        const message = (body && body.message) || `请求失败(${res.statusCode})`
        // 800: 登录无效
        if (body && body.code === 800) {
          handleAuthFailure()
        }
        reject(new Error(message))
      },
      fail: err => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}
