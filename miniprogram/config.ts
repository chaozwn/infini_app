// 全局配置
// BASE_URL 按运行平台切换：
// - 仅「微信开发者工具」(platform === 'devtools') 使用本地开发地址 DEV_BASE_URL，
//   并需在工具里勾选「不校验合法域名」。
// - 真机（预览 / 体验版 / 正式版）一律使用线上 HTTPS 域名 PROD_BASE_URL。
//   原因：手机访问不到 localhost，且 localhost 不可能加入 request 合法域名，
//   会报 "request:fail url not in domain list:localhost"。
// 上线前确保 PROD_BASE_URL 已在小程序后台「开发管理 → 服务器域名」中
// 加入 request 与 downloadFile 合法域名。

const DEV_BASE_URL = 'http://localhost:3001'
const PROD_BASE_URL = 'https://infinisynapse.cn'

function resolveBaseUrl(): string {
  try {
    // 开发者工具才用本地地址；真机一律走线上域名
    const platform = wx.getSystemInfoSync().platform
    return platform === 'devtools' ? DEV_BASE_URL : PROD_BASE_URL
  } catch {
    // 极端情况下（接口不可用）兜底用生产地址
    return PROD_BASE_URL
  }
}

export const BASE_URL = resolveBaseUrl()

export const TOKEN_KEY = 'wx_mini_token'
export const USER_KEY = 'wx_mini_user'

// 分享配置（小程序卡片：标题 + 打开路径；卡片本身即链接，无需再带网址）
export const SHARE_TITLE =
  '2026高考志愿还没想好怎么填？试下 InfiniSynapse 高考选校 AI：输分数/位次和目标校，直接出冲稳保分析 PDF，数据有据可查，限时免费不用注册'
export const SHARE_PATH = '/pages/login/index'
