# MockForge 开发里程碑

更新时间：2026-05-21

## 当前状态

项目已经进入 MVP 开发阶段，第一版可运行骨架已经完成基础验证。

当前已经创建前后端 monorepo 骨架、共享类型与校验逻辑、Fastify 后端模块、React 管理后台代码，并完成 pnpm 安装、类型检查、测试、构建、生产单服务验证和浏览器验证。响应 schema 已支持固定值节点，可用于稳定返回 `code`、`page`、`pageSize` 等字段。

当前 Git 状态：

- 远程仓库已配置为 `https://github.com/DrowTT/mock-forge.git`。
- `main` 已追踪 `origin/main`。
- 上一次已推送提交是 `5c00e05 docs: add initial project requirements and design`。
- 当前新增代码尚未提交。
- 包管理工具已明确为 `pnpm`，禁止使用 `npm`。

## 已完成里程碑

### M0：产品与架构文档

状态：已完成并已推送。

产物：

- `AGENTS.md`
- `docs/requirements.md`
- `docs/technical-design.md`

明确结论：

- 代码层面前后端分离。
- 部署层面单服务一体化。
- `apps/web` 是 React + Vite 管理后台。
- `apps/server` 是 Node.js + Fastify 后端。
- `packages/shared` 放共享类型、schema 和常量。
- 管理后台路径是 `/__mockforge`。
- 管理 API 路径是 `/__mockforge/api`。
- 用户创建的 Mock API 直接挂在根路径，例如 `/api/users`。
- 接口配置需要持久化。
- 随机生成的业务响应数据不持久化。

### M1：Monorepo 基础骨架

状态：已完成并通过验证。

新增内容：

- 根目录 `package.json`
- 根目录 `tsconfig.base.json`
- `.env.example`
- `scripts/copy-web.mjs`
- `data/.gitkeep`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- pnpm workspace：`apps/*`、`packages/*`

已验证：

- 已运行 `pnpm install`。
- 已生成 `pnpm-lock.yaml`。
- 根脚本已切换为 pnpm。
- `data/.gitkeep` 已通过 `.gitignore` 规则保留。

### M2：Shared 契约层

状态：已完成并通过验证。

新增目录：

- `packages/shared`

核心文件：

- `src/constants.ts`
- `src/types.ts`
- `src/path-utils.ts`
- `src/schemas.ts`
- `src/index.ts`
- `src/schemas.test.ts`

已覆盖能力：

- HTTP method 常量。
- primitive schema 类型。
- 导入配置类型。
- 内部 API 定义类型。
- `method + path` key 工具。
- `/__mockforge` 保留路径判断。
- AI 导入配置校验。
- schema 节点递归校验。
- 路径参数与 `request.path` 一致性校验。
- 基础单元测试。

已验证：

- shared 类型检查通过。
- shared 单元测试通过。
- Zod 校验出口已做必要类型收窄。

### M3：Fastify 后端

状态：已完成并通过验证。

新增目录：

- `apps/server`

核心文件：

- `src/config/env.ts`
- `src/modules/config-store/file-config-store.ts`
- `src/modules/generator/mock-data-generator.ts`
- `src/modules/mock-runtime/route-matcher.ts`
- `src/modules/mock-runtime/request-validator.ts`
- `src/modules/mock-runtime/dispatcher.ts`
- `src/modules/security/admin-auth.ts`
- `src/modules/admin/admin.routes.ts`
- `src/app.ts`
- `src/main.ts`
- `src/app.test.ts`
- `src/modules/generator/mock-data-generator.test.ts`

已覆盖能力：

- 环境变量读取。
- 本地 JSON 配置存储。
- 配置文件初始化。
- 配置原子写入。
- API 创建、更新、删除、列表。
- AI 配置导入与校验。
- 响应 schema 预览。
- 管理 Token 校验。
- Mock Runtime 兜底分发。
- `path-to-regexp` 路径匹配。
- 请求参数宽松校验。
- Faker 随机响应生成。
- 基础集成测试。

已验证：

- 后端类型检查通过。
- 后端测试通过。
- Fastify 集成测试通过。
- 导入配置后 Mock API 可调用。
- 生产单服务启动成功。
- `/__mockforge/health` 正常。
- `/__mockforge/api/import` 正常。
- `/api/users?page=1` 正常返回随机数据。
- `@fastify/static` 改为仅托管 `/__mockforge/assets/`，SPA fallback 不再重复注册路由。

### M4：React 管理后台

状态：已完成并通过验证。

新增目录：

- `apps/web`

核心文件：

- `vite.config.ts`
- `index.html`
- `src/api/client.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`
- `src/vite-env.d.ts`

已覆盖能力：

- 接口列表。
- 新建接口。
- 编辑接口。
- 删除接口。
- 复制调用地址。
- 配置导入。
- 导入校验。
- 响应预览。
- Admin Token 本地保存。
- `/__mockforge` base path。
- Vite dev proxy 到后端。

界面定位：

- 偏紧凑的运维控制台风格。
- 不是营销页，不做 hero。
- 重点服务接口配置、导入、预览和复制调用地址。

已验证：

- Web 类型检查通过。
- Vite 生产构建通过。
- 生产服务可以托管管理后台。
- 浏览器打开 `/__mockforge` 正常。
- 静态资源请求均为 200。
- 控制台无消息。
- 管理后台默认导入示例配置成功。
- 导入后接口列表展示成功。
- 导入后 `/api/users?page=1` 返回随机响应。

### M5：依赖安装与基础验证

状态：已完成。

已执行：

```powershell
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

结果：

- `pnpm typecheck` 通过。
- `pnpm test` 通过。
- `pnpm build` 通过。

### M6：本地运行验证

状态：已完成生产单服务验证；开发双服务模式尚未单独验证。

生产验证覆盖：

```powershell
pnpm build
node apps/server/dist/main.js
```

验证点：

- 打开 `http://127.0.0.1:3100/__mockforge`。
- 后端健康检查 `http://127.0.0.1:3100/__mockforge/health`。
- 在管理后台导入示例配置。
- 调用 `http://127.0.0.1:3100/api/users?page=1`。

后续仍可补充：

- `pnpm dev` 双服务热更新模式验证。
- 重启后端后配置仍存在的手工验证。

### M7：生产单服务验证

状态：已完成。

已执行：

```powershell
pnpm build
pnpm --filter @mockforge/server start
```

验证点：

- 打开 `http://127.0.0.1:3100/__mockforge`。
- 管理 API 正常。
- Mock API 正常。
- 前端静态资源由后端托管。
- 刷新 `/__mockforge` 页面不 404。

### M8：提交当前开发成果

状态：已完成。

已提交并推送第一版可运行骨架。

### M9：Schema 固定值节点

状态：已完成并通过验证。

新增能力：

- `SchemaNode` 支持固定值节点：`{ "$type": "integer", "$value": 1 }`。
- 随机生成器遇到固定值节点时直接返回 `$value`。
- 固定值节点会校验 `$type` 是否受支持，以及 `$value` 是否符合 `$type`。
- 管理后台默认示例已加入固定 `code`、`message`、`page`、`pageSize`。
- 需求文档、技术设计和 README 已补充固定值格式。

已验证：

- `pnpm typecheck` 通过。
- `pnpm test` 通过。
- `pnpm build` 通过。
- 生产服务导入固定值配置后，`/api/users?page=1` 返回固定 `code: 0`、`message: "success"`、`page: 1`、`pageSize: 10`。

### M10：开发端口调整

状态：已完成。

变更内容：

- Vite 开发服务端口从 `5173` 调整为 `2668`。
- 开发模式管理后台地址改为 `http://localhost:2668/__mockforge`。
- `apps/server/data/` 已加入忽略规则，避免从 server 目录启动时生成的运行期配置误入 Git。

## 下次接手建议顺序

1. 先运行 `git status --short --branch`。
2. 如果本次成果还未提交，先检查 diff 后提交。
3. 后续可补 README、Dockerfile、开发模式验证和字段树编辑器。
4. 继续开发前仍建议跑 `pnpm typecheck`、`pnpm test`、`pnpm build`。

## 当前不要误判的点

- 当前代码是已验证的第一版可运行骨架，但还不是完整产品。
- 已安装依赖，已生成 `pnpm-lock.yaml`。
- 已跑过测试、类型检查和构建。
- 已做浏览器验证。
- 当前没有 Dockerfile。
- 当前没有真实发布配置。
- 当前管理后台只做了 JSON 编辑体验，还不是可视化字段树编辑器。
