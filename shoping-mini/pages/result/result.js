const { request } = require('../../utils/request')
const config = require('../../config')
const { getToken } = require('../../utils/auth')

const POLL_INTERVAL = 5000
const PAUSED_POLL_INTERVAL = 15000 // 暂停态放慢轮询，便于用户在 PC 端继续后自动恢复
const MAX_POLLS = 120 // 最长约 10 分钟

/** 通过 infini-proxy 代理下载截图（image 标签无法带 Authorization） */
function downloadScreenshot(taskId, file) {
  const token = getToken()
  return new Promise((resolve) => {
    wx.downloadFile({
      url: `${config.apiBaseUrl}/miniapp/shopping/snapshot?taskId=${encodeURIComponent(taskId)}&file=${encodeURIComponent(file)}`,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath)
        else resolve('')
      },
      fail() {
        resolve('')
      },
    })
  })
}

async function resolveScreenshotPaths(taskId, files) {
  if (!files || !files.length) return []
  const paths = await Promise.all(files.map((file) => downloadScreenshot(taskId, file)))
  return paths.filter(Boolean)
}

Page({
  data: {
    taskId: '',
    status: 'submitted',
    statusText: '',
    finished: false,
    paused: false,
    thinkingSteps: [],
    resultContent: '',
    resultSource: '',
    screenshots: [],
    screenshotFiles: [],
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
      const status = (res && res.status) || 'submitted'
      const finished = status === 'completed'
      const paused = status === 'paused'
      const screenshotFiles = (res && res.screenshots) || []
      let localScreenshots = this.data.screenshots
      const filesKey = screenshotFiles.join('|')
      if (filesKey !== this._lastScreenshotFilesKey) {
        this._lastScreenshotFilesKey = filesKey
        localScreenshots = await resolveScreenshotPaths(this.data.taskId, screenshotFiles)
      }
      this.setData({
        status,
        finished,
        paused,
        statusText: (res && res.statusText) || '',
        thinkingSteps: (res && res.thinkingSteps) || [],
        resultContent: (res && res.resultContent) || '',
        resultSource: (res && res.resultSource) || '',
        screenshotFiles,
        screenshots: localScreenshots,
        appUrl: (res && res.appUrl) || '',
      })
      if (finished) return
      // 暂停态：放慢轮询（用户可能在 PC 端继续），但不再用快频
      if (paused) {
        const polls = this.data.polls + 1
        this.setData({ polls })
        if (polls >= MAX_POLLS || this.stopped) return
        this.timer = setTimeout(() => this.poll(), PAUSED_POLL_INTERVAL)
        return
      }
    } catch (err) {
      // 轮询出错不打断，继续重试
      console.warn('[miniapp] poll error', err)
    }

    const polls = this.data.polls + 1
    this.setData({ polls })
    if (polls >= MAX_POLLS || this.stopped) return
    this.timer = setTimeout(() => this.poll(), POLL_INTERVAL)
  },

  previewShot(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({ current: url, urls: this.data.screenshots })
  },

  copyAppUrl() {
    if (!this.data.appUrl) return
    wx.setClipboardData({
      data: this.data.appUrl,
      success: () => wx.showToast({ title: '已复制，去 PC 查看详情', icon: 'none' }),
    })
  },

  again() {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    // reLaunch 关闭所有页面、重开表单页，避免 redirectTo 在某些页面栈状态下静默失败
    wx.reLaunch({
      url: '/pages/shopping/shopping',
      fail: (err) => {
        console.error('[miniapp] reLaunch to shopping failed', err)
        wx.redirectTo({ url: '/pages/shopping/shopping' })
      },
    })
  },
})
