const { request } = require('../../utils/request')

Page({
  data: {
    loading: true,
    detecting: false,
    pcShoppingUrl: '',
    pluginDocUrl: '',
    registerUrl: '',
    bound: false,
    steps: [
      '在 PC 端 Chrome 打开下方购物页地址',
      '用「同一手机号」登录同一个 InfiniSynapse 账号',
      '按提示下载并安装 InfiniSynapse Chrome 插件',
      '选择已登录的购物网站，填写需求，开始 AI 比价',
    ],
  },

  onLoad() {
    this.loadHandoff()
  },

  // 检测 PC Chrome 插件连接状态；连接成功则进入购物表单
  async detectPlugin() {
    if (this.data.detecting) return
    this.setData({ detecting: true })
    wx.showLoading({ title: '检测中...' })
    try {
      const res = await request({ url: '/miniapp/browser-session', auth: true })
      if (res && res.connected) {
        wx.showToast({ title: '插件已连接', icon: 'success' })
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/shopping/shopping' })
        }, 600)
      } else {
        wx.showModal({
          title: '未检测到插件',
          content: '请确认已在 PC 端 Chrome 用同一账号登录并安装插件，然后重试。',
          showCancel: false,
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

  async loadHandoff() {
    this.setData({ loading: true })
    try {
      const res = await request({ url: '/miniapp/handoff', auth: true })
      this.setData({
        pcShoppingUrl: res.pcShoppingUrl,
        pluginDocUrl: res.pluginDocUrl,
        registerUrl: res.registerUrl,
        bound: res.bound,
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  copyUrl(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '已复制，去 PC 浏览器打开', icon: 'none' }),
    })
  },
})
