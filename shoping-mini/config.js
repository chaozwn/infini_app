// 全局配置
//
// apiBaseUrl：后端 infini-proxy 的基础地址（含全局前缀 /api）。
// - 本地开发：http://localhost:3000/api（在微信开发者工具里勾选「不校验合法域名」）
// - 体验版/正式版：换成 https 域名，并在小程序后台「开发管理-服务器域名」里配置 request 合法域名
const config = {
  apiBaseUrl: 'http://localhost:3000/api',
}

module.exports = config
