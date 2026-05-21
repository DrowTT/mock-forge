---
date: '2026-05-21'
category: tooling
tags: [pnpm, fastify, vite, monorepo, static-assets]
severity: major
title: 'pnpm workspace 项目要显式使用 workspace 协议并避免 Fastify 静态通配路由重复'
---

## 问题描述

MockForge MVP 骨架验证时遇到三类容易复发的问题：

- `pnpm install` 将本地 `@mockforge/shared` 当成外部包去 registry 拉取。
- 生产服务启动时报 `FST_ERR_DUPLICATED_ROUTE`，提示 `GET /__mockforge/*` 重复注册。
- 浏览器管理后台加载成功后，控制台出现表单字段和 favicon 相关噪声。

## 根因分析

`pnpm` 不读取 `package.json` 里的 npm workspaces 作为工作区来源，需要 `pnpm-workspace.yaml`。本地 workspace 依赖如果写成普通版本号，例如 `"0.1.0"`，可能被当成 registry 包解析，应该写成 `"workspace:*"`。

`@fastify/static` 挂载 `prefix: "/__mockforge/"` 时会注册 `GET /__mockforge/*`。如果再手写同样的 SPA fallback，就会和插件路由重复。

浏览器会对 password input、textarea、select 等表单控件做可访问性和密码管理提示；缺少 `id`、`name`、`autocomplete` 时，即使功能可用，也会在 DevTools 里留下 issue。

## 解决方案

- 新增 `pnpm-workspace.yaml`，根脚本全部切换为 pnpm。
- workspace 依赖统一写为 `"workspace:*"`。
- 构建与验证脚本先构建 `@mockforge/shared`，再验证 server/web。
- 将静态资源只挂载到 `/__mockforge/assets/`，`/__mockforge` 与 `/__mockforge/*` 手写返回 `index.html`。
- 为管理后台表单控件补齐 `id`、`name`、`autocomplete`，并使用 data favicon 避免 `/favicon.ico` 404。

## 经验教训

> monorepo 的包管理器、workspace 协议和生产静态路由要在第一轮验证中同时跑通，不能只相信类型检查或单元测试。

- pnpm 项目必须提交 `pnpm-workspace.yaml` 和 `pnpm-lock.yaml`。
- 本地包依赖优先使用 `workspace:*`，避免误走 registry。
- Fastify 静态资源插件的 prefix 会生成通配路由，SPA fallback 要避开同一路径。
- 前端验证不要只看页面能否打开，还要看 Network 和 Console/Issues 是否干净。

## 相关文件

- `package.json`
- `pnpm-workspace.yaml`
- `apps/server/src/app.ts`
- `apps/web/src/App.tsx`
- `apps/web/index.html`
