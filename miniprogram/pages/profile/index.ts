import { ensureAuth, getUserInfo, isGuest, login, StoredUser } from '../../utils/auth'
import { request } from '../../utils/request'
import { SHARE_PATH, SHARE_TITLE } from '../../config'

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || ''
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

interface PhoneNumberEvent {
  detail: { errMsg: string; code?: string }
}

Page({
  data: {
    user: null as StoredUser | null,
    phoneText: '',
    guest: false,
    binding: false,
  },

  async onShow() {
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
    await ensureAuth()
    const local = getUserInfo()
    this.setData({
      user: local,
      phoneText: maskPhone((local && local.phone) || ''),
      guest: isGuest(),
    })
    this.refreshProfile()
  },

  onShareAppMessage() {
    return { title: SHARE_TITLE, path: SHARE_PATH }
  },

  onShareTimeline() {
    return { title: SHARE_TITLE }
  },

  async refreshProfile() {
    try {
      const profile = await request<StoredUser>({ url: '/api/mini/auth/profile' })
      if (profile) {
        this.setData({
          user: profile,
          phoneText: maskPhone(profile.phone || ''),
          guest: !profile.phone,
        })
      }
    } catch {
      // 静默失败，使用本地缓存
    }
  },

  // 游客绑定手机号：携带 phoneCode 重新登录，后端按同一 openid 合并账号与历史记录
  async onBindPhone(e: PhoneNumberEvent) {
    if (!e.detail.code) {
      wx.showToast({ title: '需授权手机号才能绑定', icon: 'none' })
      return
    }
    if (this.data.binding) return

    this.setData({ binding: true })
    try {
      const res = await login({ phoneCode: e.detail.code })
      this.setData({
        user: getUserInfo(),
        phoneText: maskPhone(res.phone || ''),
        guest: !res.phone,
      })
      wx.showToast({ title: '绑定成功', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: (err as Error).message || '绑定失败', icon: 'none' })
    } finally {
      this.setData({ binding: false })
    }
  },

  goHistory() {
    wx.switchTab({ url: '/pages/history/index' })
  },

  goCreate() {
    wx.switchTab({ url: '/pages/gaokao/index' })
  },

})
