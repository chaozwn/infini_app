# InfiniSynapse 小程序示例集

本仓库开源了两个基于 **InfiniSynapse** 底座开发的微信小程序，供大家参考、学习如何在小程序端接入并调用 InfiniSynapse 的 AI 能力。

> InfiniSynapse 是一套 AI Agent 应用底座，提供账号体系、Agent 执行、任务编排等能力。两个示例小程序均作为「入口 / 交互层」，真正的 AI 推理与任务执行由 InfiniSynapse 后端完成。

## 仓库中的小程序

| 目录 | 名称 | 定位 | 技术栈 | AppID |
|------|------|------|--------|-------|
| [`exam-mini/`](./exam-mini) | 高考报考选校 | 输入分数 / 位次和目标院校，AI 给出冲稳保分析报告 | TypeScript + Sass | `wxb71f373a96ea2523` |
| [`shoping-mini/`](./shoping-mini) | 省钱比价助手 | 微信登录入口 + 引导中转，购物比价在 PC 端插件执行 | JavaScript | `wxb2593c4dd46cf539` |

### 1. 高考报考选校（`exam-mini`）

面向高考志愿填报场景的 AI 选校助手：

- **选校**：填写省份、科类、分数 / 位次、目标院校及意向优先级，提交后由 InfiniSynapse AI 生成「冲 / 稳 / 保」志愿分析报告（支持导出 PDF）。
- **历史**：查看往次分析记录。
- **我的**：账号信息与登录状态。

页面结构：`pages/gaokao`（选校 + 结果）、`pages/history`、`pages/profile`、`pages/webview`。后端服务地址通过 `miniprogram/config.ts` 按运行环境自动切换（开发者工具走 `localhost`，真机走线上 `infinisynapse.cn`）。

### 2. 省钱比价助手（`shoping-mini`）

AI 购物 / 比价助手的微信小程序入口，定位为 **账号入口 + 引导中转站**：

- 微信一键登录、授权获取手机号，并关联 InfiniSynapse 账号。
- 引导用户在 **PC 端 Chrome** 安装 InfiniSynapse 浏览器插件。
- 真正的比价、读差评、加购物车等 AI 购物任务在 PC 端插件中执行（手机端无法运行插件）。

详细说明（页面、后端接口、环境变量、联调步骤）见 [`shoping-mini/README.md`](./shoping-mini/README.md)。

## 快速开始

1. 用**微信开发者工具**分别打开 `exam-mini/` 或 `shoping-mini/` 目录（各自独立的小程序项目）。
2. 本地联调时勾选「**不校验合法域名**」，后端接口默认指向 `localhost`。
3. 真机预览 / 体验版 / 正式版会自动切换到线上域名（`infinisynapse.cn` / `api.infinisynapse.cn`），上线前需在小程序后台「开发管理 → 服务器域名」中配置对应的合法域名。

## 说明

- 两个小程序均为**示例项目**，主要用于展示 InfiniSynapse 在小程序端的接入方式，部分能力（如购物任务列表）在示例中为占位实现。
- 每个子目录都是可独立编译运行的完整小程序工程，互不依赖。
