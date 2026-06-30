const STORAGE_KEY = 'shopping_task_history'
const MAX_ITEMS = 50

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatTime(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getTasks() {
  try {
    const list = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function saveTasks(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, list)
  } catch (e) {
    // ignore
  }
}

// 新增一条历史任务（按 taskId 去重，最新置顶）
function addTask(task) {
  if (!task || !task.taskId) return
  const now = Date.now()
  const record = {
    taskId: task.taskId,
    item: task.item || '购物任务',
    priorities: task.priorities || [],
    sites: task.sites || [],
    createdAt: now,
    createdAtText: formatTime(now),
  }
  const list = getTasks().filter((t) => t.taskId !== record.taskId)
  list.unshift(record)
  saveTasks(list.slice(0, MAX_ITEMS))
}

function removeTask(taskId) {
  saveTasks(getTasks().filter((t) => t.taskId !== taskId))
}

function clearTasks() {
  try {
    wx.removeStorageSync(STORAGE_KEY)
  } catch (e) {
    // ignore
  }
}

module.exports = {
  getTasks,
  addTask,
  removeTask,
  clearTasks,
  formatTime,
}
