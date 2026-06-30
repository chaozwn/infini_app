# 省钱比价助手 · 微信小程序

InfiniSynapse「AI 购物（省钱比价助手）」的微信小程序入口。

小程序定位：**账号入口 + 引导中转站**。AI 购物（比价、读差评、加购物车）实际在 **PC 端 Chrome + InfiniSynapse 浏览器插件** 中执行，手机端无法运行插件。小程序负责：

1. 微信一键登录
2. 授权并获取手机号
3. 用手机号关联 InfiniSynapse(Authing) 账号（未匹配到则引导去 PC 注册/绑定）
4. 引导用户在 PC 端 Chrome 安装插件并开始购物
5. 购物任务入口（第一版为占位，任务在 PC 端查看）

## 目录结构

```
shoping-mini/
├── config.js              # apiBaseUrl 配置
├── app.js / app.json / app.wxss
├── utils/
│   ├── request.js         # 统一请求封装（解包 { code, data, message }）
│   └── auth.js            # 会话 token 本地存储
└── pages/
    ├── login/             # 微信登录 + 手机号授权
    ├── home/              # 我的：账号状态 + 入口
    ├── guide/             # PC 安装插件引导 + 链接复制
    └── tasks/             # 购物任务（占位）
```

## 配置

1. `config.js` 会根据运行环境自动选择 `apiBaseUrl`：
   - **开发者工具模拟器**：`http://localhost:3000/api`（需勾选「不校验合法域名」）
   - **真机预览 / 体验版 / 正式版**：`https://api.infinisynapse.cn/api`
2. `project.config.json` 中 `appid` 已为 `wxb2593c4dd46cf539`。

### 微信小程序后台 · 服务器域名（国内正式版）

| 类型 | 填写域名（不带 `https://`） |
|------|------------------------------|
| request 合法域名 | `api.infinisynapse.cn` |
| downloadFile 合法域名 | `api.infinisynapse.cn`（截图代理 `/miniapp/shopping/snapshot`） |
| uploadFile / socket | 暂不需要 |
| 业务域名 | 暂不需要（无 web-view，链接均为复制到剪贴板） |

> 国内用 `.cn`；`.com` 为海外 API（`api.infinisynapse.com`），小程序在国内勿配。

## 后端依赖（infini-proxy/packages/server）

新增 `miniapp` 模块，接口（全局前缀 `/api`）：

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/miniapp/login` | `{ code }` wx.login 换取会话，返回 `{ token, bound, needBindPhone, account }` |
| POST | `/api/miniapp/bind-phone` | 携带 `Bearer token` + `{ code }`，换手机号并关联账号 |
| GET | `/api/miniapp/profile` | 当前用户资料 |
| GET | `/api/miniapp/handoff` | PC 端引导信息（购物页/插件文档/注册地址） |
| GET | `/api/miniapp/tasks` | 购物任务（第一版占位） |
| GET | `/api/miniapp/browser-session` | 检测 PC Chrome 插件连接状态，返回 `{ connected, status, ... }` |
| GET | `/api/miniapp/shopping/sites` | 购物表单可选购物网站列表 |
| POST | `/api/miniapp/shopping/task` | 提交购物任务（复用 .cn 购物 agent），返回 `{ taskId, status }` |
| GET | `/api/miniapp/shopping/task?taskId=` | 轮询任务结果（思考过程 + 最终 Markdown 报告 + 截图路径） |
| GET | `/api/miniapp/shopping/snapshot?taskId=&file=` | 代理浏览器截图（供小程序 downloadFile） |

### 后端环境变量（`.env`）

```bash
# 微信小程序凭据（小程序后台 → 开发管理 → 开发设置）
WX_MINIAPP_APPID=wxb2593c4dd46cf539
WX_MINIAPP_SECRET=你的小程序密钥

# 无凭据时本地联调用：开启后用 mock 数据替代真实微信接口
MINIAPP_MOCK=false

# 可选：引导地址（有默认值）
MINIAPP_PC_SHOPPING_URL=https://infinisynapse.cn/apps/straight-man-shopping
MINIAPP_PLUGIN_DOC_URL=https://infinisynapse.cn/en/docs/Chrome%20Plugin%20Install
MINIAPP_REGISTER_URL=https://infinisynapse.cn

# 购物执行：app 服务（agent / 浏览器会话）基址，默认线上
MINIAPP_APP_SERVICE_URL=https://app.infinisynapse.cn
# 可选：agent 语言，默认 zh_CN
MINIAPP_AGENT_LANG=zh_CN

# 复用已有：JWT_SECRET、AUTHING_*、REDIS_*
```

## 联调步骤

1. 启动后端：`cd infini-proxy/packages/server && pnpm run start:dev`
2. 无微信密钥时，先设 `MINIAPP_MOCK=true`，可在开发者工具里直接走通登录/手机号流程。
3. 用微信开发者工具打开本目录，勾选「不校验合法域名」，编译预览。
4. 配好真实 `WX_MINIAPP_SECRET` 后关闭 mock，用真机或体验版验证获取手机号。

## 已知边界（第一版，待后续完善）

- **手机号 → Authing 账号** 采用「本地绑定优先 + Authing 管理端 best-effort 查询」。Authing 不同 SDK 版本方法签名不同，`miniapp.service.ts` 的 `resolveAuthingUserIdByPhone` 做了防御式多签名尝试，接真实 Authing 后可按实际方法收敛。
- **手机号授权** 仅实现新版 `getPhoneNumber`（凭 `code`）。旧版 `encryptedData/iv` 已透传到后端但未解密。
- **购物任务列表** 为占位。真实历史需账号在 `app.infinisynapse.cn` 的 access token / API Key，后续接入账号 token 代理后补全。
- 微信 `access_token` 缓存在 Redis（`stable_token` 模式）。

## 检测插件 + 购物执行（新增）

流程：`home → guide`（PC 登录账号 + 装插件）→ 在 guide 页点「检测插件连接」→ 连接成功进入 `shopping` 表单 → 提交后进入 `result` 轮询页看思考过程与最终报告。

实现要点：

- **账号凭证**：后端复用 `ApiKeyService` 为绑定账号（`authingUserId`）在服务端直接签发 `sk-` API Key（保存在 `MiniappBinding.apiKey`），无需用户 access token。
- **插件检测**：用该 API Key 调 `app.infinisynapse.cn/api/ai_browser/session`，`status` 为 `connected/busy` 视为已连接。
- **购物执行**：移植 `.cn` 的 prompt + agent 调用逻辑（`shopping.util.ts`），用同一 API Key 直连 `/api/ai/events`、`/api/ai/message`、`/api/ai_task/*`，与官网共用同一套购物服务。

> 注意：插件登录账号、API Key 的 userId、按手机号解析出的 `authingUserId` 必须一致。生产 `AUTH_TYPE=authing` 时三者均为 Authing sub；本地 `AUTH_TYPE=jwt` 下三者不对齐，购物联调请用真实 Authing 账号或开启 `MINIAPP_MOCK=true` 走 mock 数据验证前端。
