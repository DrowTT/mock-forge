# MockForge 需求文档

## 1. 产品定位

MockForge 是一个面向前端开发场景的自部署 Mock API 平台。

它的核心作用是充当一个“伪后端服务”：用户可以在平台中创建各种接口，前端页面可以像调用真实后端一样，通过部署后的 `baseURL + API path` 调用这些接口。MockForge 根据接口配置自动返回随机生成的数据，数据内容不追求真实业务含义，只需要满足配置中的类型和结构约束。

## 2. 核心目标

MockForge 的目标是让前端开发者在真实后端未完成、接口不稳定、接口联调成本较高，或只需要快速验证页面效果时，可以独立创建可调用的模拟接口。

系统需要保证：

- 可以创建多个可被外部调用的 HTTP 接口。
- 每个接口可以配置请求方法、接口路径、请求参数和响应数据结构。
- 响应内容默认由系统随机生成。
- 随机生成的数据必须符合配置中的字段类型。
- 对于状态码、业务 code、分页页码、页面大小等需要稳定的字段，用户可以配置固定值。
- 接口可以部署在用户自己的网站或服务器上。
- 前端可以通过 `baseURL + API path` 直接调用配置好的 Mock 接口。

## 3. 典型使用场景

### 3.1 前端页面开发

前端开发者创建一个列表接口、详情接口或提交接口，用于本地页面开发和交互调试。

### 3.2 后端未完成时提前开发

真实后端接口尚未完成时，前端可以先根据约定字段创建 Mock 接口，减少等待时间。

### 3.3 AI 辅助生成接口配置

用户向 AI 描述页面或接口需求，AI 输出符合 MockForge 约定格式的配置 JSON。用户将该配置导入 MockForge 后，即可生成对应接口。

## 4. 架构定位

MockForge 在代码组织上采用前后端分离，但在生产部署上采用单服务一体化。

也就是说：

- 管理后台前端独立开发，负责接口配置、配置导入和响应预览。
- 后端服务独立开发，负责管理 API、Mock API 运行时、配置校验和随机数据生成。
- 前后端共享类型、schema 和常量，避免配置格式在两端不一致。
- 生产环境中，前端管理页面构建为静态资源，由后端服务统一托管。
- 最终部署形态是一个 Node.js 服务或一个 Docker 容器，而不是两个必须独立部署的服务。

部署后的路径约定：

- 管理后台页面：`https://your-domain.com/__mockforge`
- 管理后台 API：`https://your-domain.com/__mockforge/api`
- 用户创建的 Mock API：`https://your-domain.com/api/users`

因此，MockForge 可以被理解为：

> 代码层面前后端分离，部署层面前后端一体化。

## 5. 第一阶段功能范围

### 5.1 接口创建与管理

用户可以创建 Mock 接口，每个接口包含以下信息：

- 接口名称
- HTTP 请求方法，例如 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`
- 接口路径，例如 `/api/users`
- 请求参数定义
- 响应状态码
- 响应数据结构定义

### 5.2 请求参数配置

接口可以配置以下类型的请求参数：

- `query`：查询参数，例如 `/api/users?page=1&pageSize=10`
- `path`：路径参数，例如 `/api/users/:id`
- `body`：请求体参数，主要用于 `POST`、`PUT`、`PATCH` 等请求

请求参数只需要定义字段名和字段类型。第一阶段不要求根据请求参数生成不同业务内容。

### 5.3 响应数据类型配置

用户主要配置响应数据的结构和字段类型，不需要填写真实响应内容。

如果某些字段需要稳定返回，例如业务状态码、分页页码、页面大小、布尔开关等，可以配置固定值。

示例：

```json
{
  "id": "number",
  "name": "string",
  "active": "boolean"
}
```

系统可以随机生成：

```json
{
  "id": 1024,
  "name": "Alice Chen",
  "active": true
}
```

固定值示例：

```json
{
  "code": {
    "$type": "integer",
    "$value": 0
  },
  "message": {
    "$type": "string",
    "$value": "success"
  },
  "data": {
    "page": {
      "$type": "integer",
      "$value": 1
    },
    "pageSize": {
      "$type": "integer",
      "$value": 10
    },
    "list": [
      {
        "id": "integer",
        "name": "string"
      }
    ]
  }
}
```

### 5.4 随机数据生成

MockForge 根据响应 schema 自动生成随机数据。

第一阶段建议支持的基础类型：

- `string`
- `number`
- `integer`
- `boolean`
- `datetime`
- `date`
- `email`
- `url`
- `uuid`
- `object`
- `array`
- `null`

嵌套对象和数组需要被支持，例如：

```json
{
  "list": [
    {
      "id": "number",
      "name": "string"
    }
  ],
  "total": "number"
}
```

### 5.5 网页表单配置

MockForge 需要提供一个 Web 管理界面，用户可以通过表单创建和编辑接口配置。

表单需要覆盖：

- 接口名称
- 请求方法
- 接口路径
- 请求参数 schema
- 响应状态码
- 响应体 schema

### 5.6 AI 配置导入

MockForge 需要支持导入标准格式的 JSON 配置。

该配置格式需要稳定、清晰、可验证，方便用户让 AI 生成配置后直接导入系统。

导入时系统应该：

- 校验 JSON 是否符合格式要求。
- 校验接口路径是否合法。
- 校验请求方法是否合法。
- 校验字段类型是否合法。
- 对不合法配置给出明确错误信息。

### 5.7 在线部署与接口调用

MockForge 应支持部署到用户自己的网站、服务器或云平台。

部署完成后，前端可以通过如下形式调用接口：

```text
https://your-domain.com/api/users
https://your-domain.com/api/products/list
```

其中：

- `https://your-domain.com` 是 MockForge 的部署地址。
- `/api/users`、`/api/products/list` 是用户配置的 Mock API 路径。

## 6. 暂不支持的能力

第一阶段不考虑以下能力：

- 接口之间的数据关联。
- 数据持久化。
- 真实数据库。
- 登录、注册、权限管理。
- 多租户团队协作。
- 根据请求参数返回不同业务数据。
- 复杂业务状态流转。
- 真实后端代理转发。
- 复杂的场景切换，例如成功、失败、空数据、慢请求等多场景管理。

这些能力可以作为后续版本规划，但不应进入 MVP 的核心范围。

## 7. AI 导入配置格式

### 7.1 顶层结构

AI 生成的配置必须是合法 JSON，顶层结构如下：

```json
{
  "version": "1.0",
  "apis": []
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `version` | `string` | 是 | 配置格式版本，第一版固定为 `"1.0"` |
| `apis` | `array` | 是 | 接口配置列表 |

### 7.2 单个接口结构

```json
{
  "name": "获取用户列表",
  "method": "GET",
  "path": "/api/users",
  "request": {
    "query": {
      "page": "integer",
      "pageSize": "integer",
      "keyword": "string"
    },
    "path": {},
    "body": {}
  },
  "response": {
    "status": 200,
    "body": {
      "code": "integer",
      "message": "string",
      "data": {
        "list": [
          {
            "id": "integer",
            "name": "string",
            "email": "email",
            "active": "boolean",
            "createdAt": "datetime"
          }
        ],
        "total": "integer"
      }
    }
  }
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | 是 | 接口名称，用于管理界面展示 |
| `method` | `string` | 是 | HTTP 请求方法 |
| `path` | `string` | 是 | 接口路径，必须以 `/` 开头 |
| `request` | `object` | 是 | 请求参数定义 |
| `response` | `object` | 是 | 响应定义 |

### 7.3 请求参数结构

```json
{
  "request": {
    "query": {},
    "path": {},
    "body": {}
  }
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query` | `object` | 否 | 查询参数定义 |
| `path` | `object` | 否 | 路径参数定义 |
| `body` | `object` | 否 | 请求体参数定义 |

如果某一类参数不存在，可以使用空对象 `{}`。

### 7.4 响应结构

```json
{
  "response": {
    "status": 200,
    "body": {}
  }
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `status` | `number` | 是 | HTTP 响应状态码 |
| `body` | `object` | 是 | 响应体 schema |

## 8. AI 输出约束

为了提高导入稳定性，给 AI 的提示词应要求它遵守以下规则：

- 只输出 JSON，不输出 Markdown。
- 不要使用注释。
- 不要输出解释文字。
- `version` 固定为 `"1.0"`。
- `method` 只能使用 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`。
- `path` 必须以 `/` 开头。
- 字段类型只能使用 MockForge 支持的类型。
- 需要固定返回的字段可以使用固定值节点：`{ "$type": "integer", "$value": 1 }`。
- 固定值节点必须只包含 `$type` 和 `$value` 两个字段。
- 固定值节点的 `$value` 必须符合 `$type`，例如 `integer` 对应整数，`boolean` 对应布尔值。
- 数组必须使用单元素数组表示元素结构。
- 对象必须使用 JSON object 表示。
- 不要生成真实业务数据，只生成 schema 配置。

## 9. 推荐给 AI 的配置生成提示词

可以将以下提示词提供给 AI：

```text
请为 MockForge 生成一份 Mock API 导入配置。

要求：
1. 只输出合法 JSON，不要输出 Markdown、注释或解释文字。
2. 顶层结构必须包含 version 和 apis。
3. version 固定为 "1.0"。
4. apis 是接口数组。
5. 每个接口必须包含 name、method、path、request、response。
6. method 只能是 GET、POST、PUT、PATCH、DELETE。
7. path 必须以 / 开头。
8. request 必须包含 query、path、body 三个对象；没有参数时使用空对象 {}。
9. response 必须包含 status 和 body。
10. body 中默认只描述字段类型，不要填写真实业务内容。
11. 字段类型只能使用 string、number、integer、boolean、datetime、date、email、url、uuid、object、array、null。
12. 数组字段必须使用单元素数组描述数组元素结构，例如 "list": [{ "id": "integer", "name": "string" }]。
13. 如果字段需要固定返回值，使用固定值节点，例如 "code": { "$type": "integer", "$value": 0 }、"page": { "$type": "integer", "$value": 1 }、"success": { "$type": "boolean", "$value": true }。
14. 固定值节点必须只包含 "$type" 和 "$value"，且 "$value" 必须符合 "$type"。

请根据以下需求生成配置：
【在这里描述页面或接口需求】
```

## 10. 完整导入配置示例

```json
{
  "version": "1.0",
  "apis": [
    {
      "name": "获取用户列表",
      "method": "GET",
      "path": "/api/users",
      "request": {
        "query": {
          "page": "integer",
          "pageSize": "integer",
          "keyword": "string"
        },
        "path": {},
        "body": {}
      },
      "response": {
        "status": 200,
        "body": {
          "code": {
            "$type": "integer",
            "$value": 0
          },
          "message": {
            "$type": "string",
            "$value": "success"
          },
          "data": {
            "list": [
              {
                "id": "integer",
                "name": "string",
                "email": "email",
                "active": "boolean",
                "createdAt": "datetime"
              }
            ],
            "page": {
              "$type": "integer",
              "$value": 1
            },
            "pageSize": {
              "$type": "integer",
              "$value": 10
            },
            "total": "integer"
          }
        }
      }
    },
    {
      "name": "创建用户",
      "method": "POST",
      "path": "/api/users",
      "request": {
        "query": {},
        "path": {},
        "body": {
          "name": "string",
          "email": "email",
          "active": "boolean"
        }
      },
      "response": {
        "status": 200,
        "body": {
          "code": {
            "$type": "integer",
            "$value": 0
          },
          "message": {
            "$type": "string",
            "$value": "success"
          },
          "data": {
            "id": "integer",
            "name": "string",
            "email": "email",
            "active": "boolean"
          }
        }
      }
    },
    {
      "name": "获取商品详情",
      "method": "GET",
      "path": "/api/products/:id",
      "request": {
        "query": {},
        "path": {
          "id": "integer"
        },
        "body": {}
      },
      "response": {
        "status": 200,
        "body": {
          "code": {
            "$type": "integer",
            "$value": 0
          },
          "message": {
            "$type": "string",
            "$value": "success"
          },
          "data": {
            "id": "integer",
            "title": "string",
            "price": "number",
            "coverUrl": "url",
            "inStock": "boolean",
            "updatedAt": "datetime"
          }
        }
      }
    }
  ]
}
```

## 11. 一句话描述

MockForge 是一个面向前端开发场景的自部署 Mock API 平台，支持通过 Web 表单或 AI 生成配置快速创建伪后端接口，并根据请求和响应类型定义自动生成随机但结构合法的数据，供前端页面通过统一 baseURL 直接调用。
