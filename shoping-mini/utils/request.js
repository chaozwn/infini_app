// 统一请求封装：自动拼接 baseUrl、带上会话 token、解包后端统一响应结构
const config = require('../config')
const { getToken, clearToken } = require('./auth')

/**
 * @param {object} options
 * @param {string} options.url      以 / 开头的路径，如 /miniapp/login
 * @param {string} [options.method] GET/POST...
 * @param {object} [options.data]   请求体/查询参数
 * @param {boolean} [options.auth]  是否携带登录 token
 */
function request({ url, method = 'GET', data = {}, auth = false }) {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' }
    if (auth) {
      const token = getToken()
      if (token) header['Authorization'] = `Bearer ${token}`
    }

    wx.request({
      url: `${config.apiBaseUrl}${url}`,
      method,
      data,
      header,
      success(res) {
        const body = res.data || {}
        // 后端统一包装：{ code, data, message }，以业务 code 为准
        // 注意：NestJS 的 POST 默认返回 HTTP 201，不能用 statusCode === 200 判断成功
        if (body && body.code === 200) {
          resolve(body.data)
          return
        }
        // 登录失效
        if (body && body.code === 800) {
          clearToken()
          reject(new Error(body.message || '登录已失效，请重新登录'))
          return
        }
        // 没有业务包装时，回退到 HTTP 状态码判断（2xx 视为成功）
        if (!body.code && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body)
          return
        }
        reject(new Error(body.message || `请求失败（${res.statusCode}）`))
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误，请稍后再试'))
      },
    })
  })
}

module.exports = { request }
