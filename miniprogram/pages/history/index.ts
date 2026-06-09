import { ensureLogin } from '../../utils/auth'
import { request } from '../../utils/request'

interface HistoryItem {
  recordId: string
  status: 'pending' | 'submitted' | 'completed' | 'failed'
  province: string
  score: string
  rank: string
  targetSchool: string
  targetMajor: string
  pdfReady: boolean
  createdAt: string
  createdAtText?: string
  statusText?: string
}

interface HistoryResp {
  total: number
  page: number
  pageSize: number
  list: HistoryItem[]
}

const STATUS_TEXT: Record<string, string> = {
  pending: '排队中',
  submitted: '生成中',
  completed: '已完成',
  failed: '失败',
}

const PAGE_SIZE = 20

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface ItemTapEvent {
  currentTarget: { dataset: { id: string } }
}

Page({
  data: {
    list: [] as HistoryItem[],
    loading: false,
    page: 1,
    total: 0,
    hasMore: true,
  },

  onShow() {
    if (!ensureLogin()) return
    this.reload()
  },

  onPullDownRefresh() {
    this.reload(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPage(this.data.page + 1)
    }
  },

  reload(done?: () => void) {
    this.setData({ list: [], page: 1, hasMore: true })
    this.loadPage(1, done)
  },

  async loadPage(page: number, done?: () => void) {
    if (this.data.loading) {
      done && done()
      return
    }
    this.setData({ loading: true })
    try {
      const resp = await request<HistoryResp>({
        url: `/api/mini/gaokao/history?page=${page}&pageSize=${PAGE_SIZE}`,
      })
      const decorated = resp.list.map(item => ({
        ...item,
        statusText: STATUS_TEXT[item.status] || item.status,
        createdAtText: formatTime(item.createdAt),
      }))
      const list = page === 1 ? decorated : this.data.list.concat(decorated)
      this.setData({
        list,
        page: resp.page,
        total: resp.total,
        hasMore: list.length < resp.total,
      })
    } catch (err) {
      wx.showToast({ title: (err as Error).message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
      done && done()
    }
  },

  openDetail(e: ItemTapEvent) {
    wx.navigateTo({ url: `/pages/gaokao/result?id=${e.currentTarget.dataset.id}` })
  },

  goCreate() {
    wx.switchTab({ url: '/pages/gaokao/index' })
  },
})
