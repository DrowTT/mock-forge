# MockForge

MockForge 是一个面向前端开发的自部署 Mock API 平台。用户可以通过管理后台创建接口，或导入 AI 生成的标准 JSON 配置，MockForge 会根据响应 schema 随机生成结构合法的数据。

## 架构

- `apps/web`：React + Vite 管理后台。
- `apps/server`：Node.js + Fastify 后端与 Mock Runtime。
- `packages/shared`：前后端共享类型、Zod schema、常量和路径工具。

代码层面前后端分离，生产部署为单服务一体化。管理后台挂载在 `/__mockforge`，管理 API 挂载在 `/__mockforge/api`，用户创建的 Mock API 直接挂载在根路径，例如 `/api/users`。

## 包管理

本项目只使用 pnpm。

```powershell
pnpm install
```

## 开发

```powershell
pnpm dev
```

开发模式下：

- 管理后台：`http://localhost:2668/__mockforge`
- 后端服务：`http://localhost:3000`
- 健康检查：`http://localhost:3000/__mockforge/health`

## 验证

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## 生产运行

```powershell
pnpm build
pnpm start
```

生产模式下，Fastify 会托管构建后的管理后台，并同时提供管理 API 和用户创建的 Mock API。

## Schema 固定值

响应字段默认按类型随机生成。如果希望某个字段稳定返回固定值，例如 `code`、`page`、`pageSize`，可以使用固定值节点：

```json
{
  "code": { "$type": "integer", "$value": 0 },
  "message": { "$type": "string", "$value": "success" },
  "data": {
    "page": { "$type": "integer", "$value": 1 },
    "pageSize": { "$type": "integer", "$value": 10 },
    "list": [{ "id": "integer", "name": "string" }]
  }
}
```

## 环境变量

参考 `.env.example`。

常用变量：

- `PORT`：服务端口，默认 `3000`。
- `MOCKFORGE_DATA_DIR`：配置文件目录，默认 `./data`。
- `MOCKFORGE_ADMIN_TOKEN`：管理后台访问 Token。
- `MOCKFORGE_CORS_ORIGINS`：跨域来源，默认 `*`。
