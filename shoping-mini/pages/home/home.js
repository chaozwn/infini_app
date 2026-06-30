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
    detecting: false,
    bound: false,
    needBindPhone: false,
    account: null,
    pluginConnected: false,
    pluginChecking: false,
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
      // 远程链路状态以「插件真实连接」为准，而非账号是否关联
      if (res.bound) {
        this.checkPlugin()
      } else {
        this.setData({ pluginConnected: false, pluginChecking: false })
      }
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

  // 仅检测插件连接状态用于首页链路灯，不跳转
  async checkPlugin() {
    if (this.data.pluginChecking) return
    this.setData({ pluginChecking: true })
    try {
      const res = await request({ url: '/miniapp/browser-session', auth: true })
      this.setData({ pluginConnected: !!(res && res.connected) })
    } catch (err) {
      this.setData({ pluginConnected: false })
    } finally {
      this.setData({ pluginChecking: false })
    }
  },

  // 检测 PC Chrome 插件连接状态；连接成功则进入购物表单
  async detectPlugin() {
    if (this.data.detecting) return
    this.setData({ detecting: true })
    wx.showLoading({ title: '检测中...' })
    try {
      const res = await request({ url: '/miniapp/browser-session', auth: true })
      this.setData({ pluginConnected: !!(res && res.connected) })
      if (res && res.connected) {
        wx.showToast({ title: '插件已连接', icon: 'success' })
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/shopping/shopping' })
        }, 600)
      } else {
        wx.showModal({
          title: '未检测到插件',
          content: '请确认已在 PC 端 Chrome 用同一账号登录并安装插件，然后重试。',
          confirmText: '查看指引',
          cancelText: '我再试试',
          success: (r) => {
            if (r.confirm) wx.navigateTo({ url: '/pages/guide/guide' })
          },
        })
      }
    } catch (err) {
      wx.showModal({
        title: '检测失败',
        content: (err && err.message) || '请稍后重试',
        showCancel: false,
      })
    } finally {
      wx.hideLoading()
      this.setData({ detecting: false })
    }
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
