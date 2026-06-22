const { request } = require('../../utils/request')

const PRIORITY_OPTIONS = ['省心', '靠谱', '少踩坑', '性价比', '品质', '颜值']

Page({
  data: {
    submitting: false,
    sites: [],
    selectedSites: [],
    priorityOptions: PRIORITY_OPTIONS,
    selectedPriorities: [],
    form: {
      item: '',
      scenario: '',
      budget: '',
      mustHave: '',
      avoid: '',
      recipient: '',
      deadline: '',
    },
  },

  onLoad() {
    this.loadSites()
  },

  async loadSites() {
    try {
      const sites = await request({ url: '/miniapp/shopping/sites', auth: true })
      this.setData({ sites: sites || [] })
    } catch (err) {
      wx.showToast({ title: err.message || '加载购物网站失败', icon: 'none' })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  toggleSite(e) {
    const id = e.currentTarget.dataset.id
    const selected = this.data.selectedSites.slice()
    const idx = selected.indexOf(id)
    if (idx >= 0) selected.splice(idx, 1)
    else selected.push(id)
    this.setData({ selectedSites: selected })
  },

  togglePriority(e) {
    const label = e.currentTarget.dataset.label
    const selected = this.data.selectedPriorities.slice()
    const idx = selected.indexOf(label)
    if (idx >= 0) selected.splice(idx, 1)
    else selected.push(label)
    this.setData({ selectedPriorities: selected })
  },

  async submit() {
    if (this.data.submitting) return
    const { form, selectedSites, selectedPriorities } = this.data

    if (!form.item.trim()) {
      wx.showToast({ title: '请填写想买的商品', icon: 'none' })
      return
    }
    if (selectedSites.length === 0) {
      wx.showToast({ title: '请至少选择一个已登录的购物网站', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })
    try {
      const res = await request({
        url: '/miniapp/shopping/task',
        method: 'POST',
        auth: true,
        data: {
          ...form,
          priorities: selectedPriorities,
          loggedInSites: selectedSites,
        },
      })
      if (!res || !res.taskId) {
        wx.showToast({ title: '提交失败：未返回任务ID', icon: 'none' })
        return
      }
      wx.redirectTo({ url: `/pages/result/result?taskId=${res.taskId}` })
    } catch (err) {
      wx.showModal({
        title: '提交失败',
        content: (err && err.message) || '请稍后重试',
        showCancel: false,
      })
    } finally {
      wx.hideLoading()
      this.setData({ submitting: false })
    }
  },
})
