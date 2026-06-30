// 全局配置
//
// apiBaseUrl 按运行环境自动选择：
// - 开发者工具模拟器 → http://localhost:3000/api（需勾选「不校验合法域名」）
// - 真机预览 / 体验版 / 正式版 → https://api.infinisynapse.cn/api

const PROD_API_BASE = 'https://api.infinisynapse.cn/api'
const DEV_API_BASE = 'http://localhost:3000/api'

function resolveApiBaseUrl() {
  if (typeof wx === 'undefined') return PROD_API_BASE
  try {
    const env = wx.getAccountInfoSync()?.miniProgram?.envVersion
    // 体验版、正式版固定走线上
    if (env === 'release' || env === 'trial') return PROD_API_BASE
    // develop：仅开发者工具模拟器用 localhost，真机调试仍走线上
    const platform = wx.getSystemInfoSync()?.platform
    if (platform === 'devtools') return DEV_API_BASE
    return PROD_API_BASE
  } catch (e) {
    return PROD_API_BASE
  }
}

module.exports = {
  get apiBaseUrl() {
    return resolveApiBaseUrl()
  },
  PROD_API_BASE,
  DEV_API_BASE,
}
