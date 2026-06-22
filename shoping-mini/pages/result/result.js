const { request } = require('../../utils/request')

const POLL_INTERVAL = 5000
const MAX_POLLS = 120 // 最长约 10 分钟

Page({
  data: {
    taskId: '',
    status: 'submitted',
    finished: false,
    thinkingSteps: [],
    resultContent: '',
    resultSource: '',
    appUrl: '',
    polls: 0,
  },

  onLoad(query) {
    const taskId = query.taskId || ''
    this.setData({ taskId })
    if (!taskId) {
      wx.showToast({ title: '缺少任务ID', icon: 'none' })
      return
    }
    this.poll()
  },

  onUnload() {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
  },

  async poll() {
    if (this.stopped) return
    try {
      const res = await request({
        url: `/miniapp/shopping/task?taskId=${this.data.taskId}`,
        auth: true,
      })
      const finished = res && res.status === 'completed'
      this.setData({
        status: (res && res.status) || 'submitted',
        finished,
        thinkingSteps: (res && res.thinkingSteps) || [],
        resultContent: (res && res.resultContent) || '',
        resultSource: (res && res.resultSource) || '',
        appUrl: (res && res.appUrl) || '',
      })
      if (finished) return
    } catch (err) {
      // 轮询出错不打断，继续重试
      console.warn('[miniapp] poll error', err)
    }

    const polls = this.data.polls + 1
    this.setData({ polls })
    if (polls >= MAX_POLLS || this.stopped) return
    this.timer = setTimeout(() => this.poll(), POLL_INTERVAL)
  },

  copyAppUrl() {
    if (!this.data.appUrl) return
    wx.setClipboardData({
      data: this.data.appUrl,
      success: () => wx.showToast({ title: '已复制，去 PC 查看详情', icon: 'none' }),
    })
  },

  again() {
    wx.redirectTo({ url: '/pages/shopping/shopping' })
  },
})
