const { request } = require('../../utils/request')
const { setToken, isLoggedIn } = require('../../utils/auth')

// 安全地写入全局账号信息（getApp() 偶发返回 undefined 时不抛异常）
function saveAccount(account) {
  try {
    const app = getApp()
    if (app && app.globalData) app.globalData.account = account
  } catch (e) {
    // ignore
  }
}

Page({
  data: {
    // step: 'login' 微信登录 / 'phone' 授权手机号
    step: 'login',
    logging: false,
    binding: false,
  },

  onLoad() {
    // 已登录直接进首页
    if (isLoggedIn()) {
      wx.reLaunch({ url: '/pages/home/home' })
    }
  },

  // 第一步：微信一键登录
  async doWxLogin() {
    if (this.data.logging) return
    this.setData({ logging: true })
    try {
      const { code } = await this.wxLogin()
      const res = await request({
        url: '/miniapp/login',
        method: 'POST',
        data: { code },
      })
      console.log('[miniapp] login res', res)
      if (!res) {
        wx.showToast({ title: '返回数据为空', icon: 'none' })
        return
      }
      setToken(res.token)
      // 先切换 UI 步骤，再写全局数据，避免任何副作用影响步骤推进
      if (res.needBindPhone) {
        // 需要授权手机号
        this.setData({ step: 'phone' })
        wx.showToast({ title: '请点击授权手机号', icon: 'none' })
      } else {
        wx.reLaunch({ url: '/pages/home/home' })
      }
      saveAccount(res.account)
    } catch (err) {
      console.error('[miniapp] login error', err)
      wx.showToast({ title: '登录失败：' + (err && err.message || err), icon: 'none' })
    } finally {
      this.setData({ logging: false })
    }
  },

  // 第二步：授权手机号（getPhoneNumber 按钮回调）
  async onGetPhone(e) {
    const detail = e.detail || {}
    if (detail.errMsg && detail.errMsg.indexOf('ok') === -1) {
      wx.showToast({ title: '已取消手机号授权', icon: 'none' })
      return
    }
    if (this.data.binding) return
    this.setData({ binding: true })
    try {
      const res = await request({
        url: '/miniapp/bind-phone',
        method: 'POST',
        auth: true,
        // 新版 getPhoneNumber 返回 code；旧版返回 encryptedData/iv（一并透传，后端按需处理）
        data: {
          code: detail.code,
          encryptedData: detail.encryptedData,
          iv: detail.iv,
        },
      })
      setToken(res.token)
      saveAccount(res.account)
      if (res.needRegister) {
        wx.showModal({
          title: '未找到账号',
          content: '该手机号还没有 InfiniSynapse 账号。请在 PC 端用同一手机号注册/绑定后再回来。',
          confirmText: '我知道了',
          showCancel: false,
        })
      }
      wx.reLaunch({ url: '/pages/home/home' })
    } catch (err) {
      wx.showToast({ title: err.message || '绑定失败', icon: 'none' })
    } finally {
      this.setData({ binding: false })
    }
  },

  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: () => reject(new Error('微信登录失败')),
      })
    })
  },
})
