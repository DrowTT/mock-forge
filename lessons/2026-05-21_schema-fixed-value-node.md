---
date: '2026-05-21'
category: pattern
tags: [schema, mock-data, validation, ai-import]
severity: tip
title: '给 schema 增加固定值能力时使用显式可判别节点'
---

## 问题描述

MockForge 原本的 schema 节点只支持基础类型字符串、对象和单元素数组。用户提出某些响应字段需要固定返回值，例如 `code: 0`、`page: 1`、`pageSize: 10`，而不是每次都随机生成。

## 根因分析

如果直接允许任意真实值作为 schema 节点，会和现有类型字符串、对象 schema、数组 schema 混在一起，导致 AI 导入格式不稳定，也会让校验器无法判断一个对象到底是“响应对象结构”还是“固定值描述”。

## 解决方案

新增显式固定值节点：

```json
{
  "$type": "integer",
  "$value": 1
}
```

规则：

- 固定值节点必须且只能包含 `$type` 和 `$value`。
- `$type` 仍然使用现有 primitive type。
- `$value` 必须是合法 JSON 值，并且必须符合 `$type`。
- 生成器遇到固定值节点时直接返回 `$value`。

## 经验教训

> 扩展配置 DSL 时，优先使用显式可判别结构，不要让真实数据和值描述与 schema 对象混杂。

- AI 导入格式需要稳定、少歧义。
- 特殊节点应该能被简单规则识别，例如“只包含两个固定 key”。
- 校验、生成、文档和示例必须同步更新，否则配置格式很快会漂。

## 相关文件

- `packages/shared/src/types.ts`
- `packages/shared/src/schemas.ts`
- `apps/server/src/modules/generator/mock-data-generator.ts`
- `docs/requirements.md`
- `docs/technical-design.md`
