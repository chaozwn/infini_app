// app.ts
import { ensureAuth } from './utils/auth'

App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 启动即静默匿名登录（按 openid 建档），用户无感知，无登录墙
    ensureAuth()
  },
})
