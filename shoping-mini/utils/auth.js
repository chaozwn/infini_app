// 登录态（会话 token）本地存储
const TOKEN_KEY = 'miniapp_token'

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setToken(token) {
  if (token) wx.setStorageSync(TOKEN_KEY, token)
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY)
}

function isLoggedIn() {
  return !!getToken()
}

module.exports = {
  TOKEN_KEY,
  getToken,
  setToken,
  clearToken,
  isLoggedIn,
}
