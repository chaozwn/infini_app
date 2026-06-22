const { request } = require('../../utils/request')
const { clearToken, isLoggedIn } = require('../../utils/auth')

function saveAccount(account) {
  try {
    const app = getApp()
    if (app && app.globalData) app.globalData.account = account
  } catch (e) {
    // ignore
  }
}

Page({
  data: {
    loading: true,
    bound: false,
    needBindPhone: false,
    account: null,
  },

  onShow() {
    if (!isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.loadProfile()
  },

  async loadProfile() {
    this.setData({ loading: true })
    try {
      const res = await request({ url: '/miniapp/profile', auth: true })
      saveAccount(res.account)
      this.setData({
        bound: res.bound,
        needBindPhone: res.needBindPhone,
        account: res.account,
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      if ((err.message || '').indexOf('登录') !== -1) {
        clearToken()
        wx.reLaunch({ url: '/pages/login/login' })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  goGuide() {
    wx.navigateTo({ url: '/pages/guide/guide' })
  },

  goTasks() {
    wx.navigateTo({ url: '/pages/tasks/tasks' })
  },

  bindPhone() {
    // 未绑定手机号时返回登录页完成授权
    wx.reLaunch({ url: '/pages/login/login' })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          clearToken()
          saveAccount(null)
          wx.reLaunch({ url: '/pages/login/login' })
        }
      },
    })
  },
})
