import { clearAuth, ensureLogin, getUserInfo, StoredUser } from '../../utils/auth'
import { request } from '../../utils/request'
import { SHARE_PATH, SHARE_TITLE } from '../../config'

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || ''
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

Page({
  data: {
    user: null as StoredUser | null,
    phoneText: '',
  },

  onShow() {
    if (!ensureLogin()) return
    const local = getUserInfo()
    this.setData({ user: local, phoneText: maskPhone((local && local.phone) || '') })
    this.refreshProfile()
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
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
        this.setData({ user: profile, phoneText: maskPhone(profile.phone || '') })
      }
    } catch {
      // 静默失败，使用本地缓存
    }
  },

  goHistory() {
    wx.switchTab({ url: '/pages/history/index' })
  },

  goCreate() {
    wx.switchTab({ url: '/pages/gaokao/index' })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: res => {
        if (res.confirm) {
          clearAuth()
          wx.reLaunch({ url: '/pages/login/index' })
        }
      },
    })
  },
})
