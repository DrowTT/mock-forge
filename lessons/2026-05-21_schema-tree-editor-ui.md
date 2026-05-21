---
date: '2026-05-21'
category: pattern
tags: [mockforge, react, schema-editor, accessibility]
severity: tip
title: 'Schema 树形编辑器要保留 JSON 模式并同步底层 DSL'
---

## 问题描述

MockForge 初版接口编辑页只提供 JSON textarea。它对 AI 导入和高级用户足够直接，但普通用户新增接口时仍然像在写 schema，和导入页体验差异不大。

## 根因分析

产品目标同时包含两类用户路径：

- 普通用户希望用 GUI 选择字段名、字段类型、对象、数组和固定值。
- 高级用户和 AI 导入链路需要继续使用稳定的 JSON DSL。

如果只做 GUI，会破坏导入格式的透明度；如果只做 JSON，又会提高普通用户配置门槛。因此编辑器必须是“表单视图操作同一个 DSL”，而不是新建一套独立配置模型。

## 解决方案

新增 `SchemaTreeEditor` 组件，让树形表单直接读写 `SchemaNode`：

- 对象节点渲染为可增删字段的字段组。
- 数组节点渲染为单个“数组元素”子节点。
- 基础类型渲染为类型选择。
- 固定值节点渲染为 `type = 固定值` 选择项和固定值输入。
- App 层保留“表单 / JSON”切换，两种模式都写回同一份 JSON 字符串。

浏览器验证时还发现动态 input/select 缺少 `name` 会产生 DevTools issue，因此递归组件里的表单控件需要统一补 `name`。

## 经验教训

> 面向非技术用户的 schema GUI 不应替代底层 DSL，而应成为 DSL 的可视化编辑视图。

- 保留 JSON 模式可以降低调试成本，也能让 AI 导入格式继续可见。
- 树形编辑器的递归模型要尽量贴近真实 schema，减少转换层和同步 Bug。
- 动态生成的表单控件也要补齐 `name`，否则浏览器可访问性检查会报 issue。
- 对固定值节点要在 GUI 中显式表达，否则用户仍然需要回到 JSON 才能配置 `code`、`page`、`pageSize`。

## 相关文件

- `apps/web/src/components/SchemaTreeEditor.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/styles.css`
