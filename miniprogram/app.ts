// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 预热微信登录态（实际登录在登录页通过手机号授权完成）
    wx.login({ success: () => {} })
  },
})
