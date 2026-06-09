import { BASE_URL, SHARE_PATH, SHARE_TITLE } from '../../config'
import { getToken } from '../../utils/auth'
import { markdownToHtml } from '../../utils/markdown'
import { request } from '../../utils/request'

interface GaokaoDetail {
  recordId: string
  status: 'pending' | 'submitted' | 'completed' | 'failed'
  province: string
  score: string
  rank: string
  targetSchool: string
  message: string
  resultContent: string
  resultSource: 'markdown_file' | 'last_message' | ''
  pdfReady: boolean
  shareUrl: string
  taskId: string
  error: string
}

const STATUS_TEXT: Record<string, string> = {
  pending: '排队中',
  submitted: '生成中',
  completed: '已完成',
  failed: '失败',
}

const POLL_INTERVAL = 3000
const MAX_POLLS = 60

Page({
  data: {
    recordId: '',
    loading: true,
    record: null as GaokaoDetail | null,
    statusText: '',
    htmlContent: '',
    downloading: false,
  },

  _timer: 0 as number,
  _polls: 0,
  _stopped: false,

  onLoad(options: Record<string, string>) {
    const recordId = options.id || ''
    this.setData({ recordId })
    this._stopped = false
    this._polls = 0
    this.poll()
    wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
  },

  onShareAppMessage() {
    return { title: SHARE_TITLE, path: SHARE_PATH }
  },

  onShareTimeline() {
    return { title: SHARE_TITLE }
  },

  onUnload() {
    this._stopped = true
    if (this._timer) clearTimeout(this._timer)
  },

  async poll() {
    if (this._stopped || !this.data.recordId) return
    this._polls++
    try {
      const detail = await request<GaokaoDetail>({
        url: `/api/mini/gaokao/result/${this.data.recordId}`,
      })
      this.setData({
        record: detail,
        loading: false,
        statusText: STATUS_TEXT[detail.status] || detail.status,
        htmlContent: detail.resultContent ? markdownToHtml(detail.resultContent) : '',
      })

      const finished = detail.status === 'completed' || detail.status === 'failed'
      if (finished || this._polls >= MAX_POLLS) return
    } catch (err) {
      this.setData({ loading: false })
      if (this._polls >= MAX_POLLS) {
        wx.showToast({ title: (err as Error).message || '加载失败', icon: 'none' })
        return
      }
    }

    this._timer = setTimeout(() => this.poll(), POLL_INTERVAL) as unknown as number
  },

  refresh() {
    this._polls = 0
    this._stopped = false
    this.setData({ loading: true })
    this.poll()
  },

  onOpenApp() {
    const record = this.data.record
    if (!record || !record.shareUrl) {
      wx.showToast({ title: '任务详情暂不可用', icon: 'none' })
      return
    }
    const url = encodeURIComponent(record.shareUrl)
    const title = encodeURIComponent('报考方案详情')
    wx.navigateTo({ url: `/pages/webview/index?url=${url}&title=${title}` })
  },

  onDownloadPdf() {
    const record = this.data.record
    if (!record || !record.pdfReady || this.data.downloading) return

    this.setData({ downloading: true })
    wx.downloadFile({
      url: `${BASE_URL}/api/mini/gaokao/result/${this.data.recordId}/pdf`,
      header: { Authorization: `Bearer ${getToken()}` },
      success: res => {
        if (res.statusCode !== 200) {
          wx.showToast({ title: 'PDF 下载失败', icon: 'none' })
          return
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'pdf',
          showMenu: true,
          fail: () => wx.showToast({ title: '打开 PDF 失败', icon: 'none' }),
        })
      },
      fail: () => wx.showToast({ title: 'PDF 下载失败', icon: 'none' }),
      complete: () => this.setData({ downloading: false }),
    })
  },
})
