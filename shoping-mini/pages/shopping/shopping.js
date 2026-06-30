const { request } = require('../../utils/request')
const { addTask } = require('../../utils/history')

const PRIORITY_OPTIONS = ['省心', '靠谱', '少踩坑', '性价比', '品质', '颜值']

Page({
  data: {
    submitting: false,
    // sites/priorities 用对象数组并自带 selected 标记，
    // 避免在 WXML 里用 indexOf 等不被支持的方法计算选中态
    sites: [],
    priorities: PRIORITY_OPTIONS.map((label) => ({ label, selected: false })),
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
      this.setData({
        sites: (sites || []).map((s) => ({ ...s, selected: false })),
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载购物网站失败', icon: 'none' })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  toggleSite(e) {
    const index = e.currentTarget.dataset.index
    const cur = this.data.sites[index]
    if (!cur) return
    this.setData({ [`sites[${index}].selected`]: !cur.selected })
  },

  togglePriority(e) {
    const index = e.currentTarget.dataset.index
    const cur = this.data.priorities[index]
    if (!cur) return
    this.setData({ [`priorities[${index}].selected`]: !cur.selected })
  },

  async submit() {
    if (this.data.submitting) return
    const { form, sites, priorities } = this.data
    const selectedSites = sites.filter((s) => s.selected).map((s) => s.id)
    const selectedPriorities = priorities.filter((p) => p.selected).map((p) => p.label)

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
      // 任务 id 保存在小程序本地，供历史页查看
      addTask({
        taskId: res.taskId,
        item: form.item.trim(),
        priorities: selectedPriorities,
        sites: selectedSites,
      })
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
