import { isLoggedIn, login } from '../../utils/auth'

interface PhoneNumberEvent {
  detail: { errMsg: string; code?: string }
}

Page({
  data: {
    logging: false,
  },

  onLoad() {
    if (isLoggedIn()) {
      wx.switchTab({ url: '/pages/gaokao/index' })
    }
  },

  async onGetPhoneNumber(e: PhoneNumberEvent) {
    if (!e.detail.code) {
      wx.showToast({ title: '需授权手机号才能登录', icon: 'none' })
      return
    }
    if (this.data.logging) return

    this.setData({ logging: true })
    try {
      const res = await login({ phoneCode: e.detail.code })
      if (!res.token) {
        wx.showToast({ title: '登录异常：未获取到登录凭证', icon: 'none' })
        return
      }
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => this.goHome(), 600)
    } catch (err) {
      wx.showToast({ title: (err as Error).message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ logging: false })
    }
  },

  goHome() {
    wx.switchTab({
      url: '/pages/gaokao/index',
      fail: err => {
        // switchTab 失败时（少数环境/编译异常）兜底用 reLaunch
        console.error('switchTab 失败，改用 reLaunch:', err)
        wx.reLaunch({
          url: '/pages/gaokao/index',
          fail: e2 => {
            console.error('reLaunch 也失败:', e2)
            wx.showToast({ title: '跳转失败，请重启小程序', icon: 'none' })
          },
        })
      },
    })
  },
})
