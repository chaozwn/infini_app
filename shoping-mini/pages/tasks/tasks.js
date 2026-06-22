const { request } = require('../../utils/request')

Page({
  data: {
    loading: true,
    tasks: [],
    message: '',
    pcShoppingUrl: '',
  },

  onLoad() {
    this.loadTasks()
  },

  async loadTasks() {
    this.setData({ loading: true })
    try {
      const res = await request({ url: '/miniapp/tasks', auth: true })
      this.setData({
        tasks: res.tasks || [],
        message: res.message || '',
        pcShoppingUrl: res.pcShoppingUrl || '',
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  copyUrl() {
    if (!this.data.pcShoppingUrl) return
    wx.setClipboardData({
      data: this.data.pcShoppingUrl,
      success: () => wx.showToast({ title: '已复制，去 PC 浏览器打开', icon: 'none' }),
    })
  },

  goGuide() {
    wx.navigateTo({ url: '/pages/guide/guide' })
  },
})
