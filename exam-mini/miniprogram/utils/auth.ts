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
 * 小程序登录：
 * - 带 phoneCode 为手机号一键登录
 * - 不带 phoneCode 为游客登录（后端按 openid 建档，历史记录跟随 openid，
 *   之后绑定手机号会自动合并到同一账号）
 */
export async function login(params: {
  phoneCode?: string
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
      phoneCode: params.phoneCode || '',
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

/** 游客登录：不授权手机号，按 openid 标识用户 */
export function guestLogin(): Promise<LoginResult> {
  return login({})
}

/** 当前登录用户是否为游客（未绑定手机号） */
export function isGuest(): boolean {
  const user = getUserInfo()
  return !!user && !user.phone
}

let guestLoginPromise: Promise<LoginResult> | null = null

/**
 * 认证守卫：无 token 时静默匿名登录（按 openid 建档），全程无登录页。
 * 并发调用共享同一个登录请求。
 */
export async function ensureAuth(): Promise<boolean> {
  if (isLoggedIn()) return true
  if (!guestLoginPromise) {
    guestLoginPromise = guestLogin().finally(() => {
      guestLoginPromise = null
    })
  }
  try {
    await guestLoginPromise
    return true
  } catch (err) {
    console.error('静默匿名登录失败:', err)
    return false
  }
}
