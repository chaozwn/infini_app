# InfiniSynapse Web Demo

最小可运行的 **Web 参考工程**：演示如何基于 InfiniSynapse 底座接入

`鉴权 → 提交 Agent 任务 → 轮询结果 → 展示 Markdown`。

逻辑精简自官网「高考报考选校 AI 助手」「省钱比价助手」与 `infini-proxy` 的 `miniapp` 模块，去掉了业务细节（PDF、Chrome 插件、Authing/微信），只保留可复用的接入骨架。

## 快速开始

```bash
cd web-demo
cp .env.example .env.local
npm install
npm run dev
```

打开 http://localhost:3010

默认 `MOCK_AGENT=true`，**无需任何 InfiniSynapse 密钥**即可走通全链路。

## 接真实 Agent

编辑 `.env.local`：

```bash
MOCK_AGENT=false
DEMO_JWT_SECRET=请换成足够长的随机串
INFINISYNAPSE_API_KEY=sk-你的密钥
INFINISYNAPSE_SERVER=https://app.infinisynapse.cn
```

API Key 只放在服务端环境变量，**不要**写进前端或提交到 Git。

## 接口一览（miniapp 风格）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | `{ name }` → `{ token, account }` |
| GET | `/api/auth/profile` | Bearer → 当前用户 + 是否 Mock |
| POST | `/api/demo/task` | `{ query, scenario? }` → `{ taskId, status }` |
| GET | `/api/demo/task?taskId=` | 轮询思考步骤 + Markdown 报告 |

响应统一为 `{ code, data, message }`（`code === 200` 成功）。

## 目录

```
web-demo/
├── app/
│   ├── page.tsx                 # Demo 页面
│   └── api/
│       ├── auth/login|profile   # 会话
│       └── demo/task            # 提交 / 轮询
├── components/DemoApp.tsx       # 前端交互
├── lib/
│   ├── auth.ts                  # Demo JWT
│   ├── agent-client.ts          # 真实 InfiniSynapse 客户端
│   ├── mock-agent.ts            # 本地 Mock
│   └── config.ts                # 仅服务端读 env
└── .env.example
```

## 安全说明

- 默认 Mock，仓库内无真实密钥、无 guest 共享 Key、无微信/Authing 凭据
- `INFINISYNAPSE_API_KEY` 仅服务端使用
- Demo 登录仅供示例，**不可用于生产**
- 输入做了长度限制；错误信息不回传密钥内容

完整架构与扩展步骤见仓库根目录 [README.md](../README.md)。
