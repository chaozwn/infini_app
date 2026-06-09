import { TOKEN_KEY, USER_KEY } from '../config'
import { request } from './request'

export interface LoginResult {
  token: string
  userId: string
  openid: string
  phone: string
  nickName: string
  avatar: string
  isNewUser: boolean
}

export interface StoredUser {
  userId: string
  openid: string
  phone: string
  nickName: string
  avatar: string
}

export function getToken(): string {
  return (wx.getStorageSync(TOKEN_KEY) as string) || ''
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function getUserInfo(): StoredUser | null {
  return (wx.getStorageSync(USER_KEY) as StoredUser) || null
}

export function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USER_KEY)
}

function wxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: res => {
        if (res.code) resolve(res.code)
        else reject(new Error('获取微信登录凭证失败'))
      },
      fail: err => reject(new Error(err.errMsg || '微信登录失败')),
    })
  })
}

/**
 * 小程序登录：必须携带手机号授权返回的 phoneCode
 */
export async function login(params: {
  phoneCode: string
  nickName?: string
  avatar?: string
}): Promise<LoginResult> {
  const code = await wxLoginCode()
  const sys = wx.getSystemInfoSync()

  const result = await request<LoginResult>({
    url: '/api/mini/auth/login',
    method: 'POST',
    data: {
      code,
      phoneCode: params.phoneCode,
      nickName: params.nickName || '',
      avatar: params.avatar || '',
      deviceModel: sys.model,
      deviceSystem: sys.system,
      appVersion: sys.version,
    },
  })

  wx.setStorageSync(TOKEN_KEY, result.token)
  const stored: StoredUser = {
    userId: result.userId,
    openid: result.openid,
    phone: result.phone,
    nickName: result.nickName,
    avatar: result.avatar,
  }
  wx.setStorageSync(USER_KEY, stored)
  return result
}

/**
 * 页面级登录守卫：未登录则跳转登录页并返回 false
 */
export function ensureLogin(): boolean {
  if (isLoggedIn()) return true
  wx.reLaunch({ url: '/pages/login/index' })
  return false
}
