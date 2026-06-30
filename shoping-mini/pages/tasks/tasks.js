const { getTasks, removeTask, clearTasks } = require('../../utils/history')

Page({
  data: {
    tasks: [],
  },

  onShow() {
    this.loadTasks()
  },

  loadTasks() {
    this.setData({ tasks: getTasks() })
  },

  openTask(e) {
    const taskId = e.currentTarget.dataset.taskId
    if (!taskId) return
    wx.navigateTo({ url: `/pages/result/result?taskId=${taskId}` })
  },

  deleteTask(e) {
    const taskId = e.currentTarget.dataset.taskId
    if (!taskId) return
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条历史任务吗？（仅删除本地记录）',
      success: (res) => {
        if (res.confirm) {
          removeTask(taskId)
          this.loadTasks()
        }
      },
    })
  },

  clearAll() {
    if (this.data.tasks.length === 0) return
    wx.showModal({
      title: '清空历史',
      content: '确定清空全部本地历史任务吗？',
      success: (res) => {
        if (res.confirm) {
          clearTasks()
          this.loadTasks()
        }
      },
    })
  },

  goGuide() {
    wx.navigateTo({ url: '/pages/guide/guide' })
  },
})
