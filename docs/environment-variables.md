# 环境变量梳理

更新时间：2026-03-30

这份文档只回答一件事：

- 当前这个项目到底有哪些环境变量或运行配置要管

它不区分“代码里怎么写”和“部署时怎么配”的视角，而是按实际使用场景来整理：

- 本地前台演示
- 本地 Prisma 真库联调
- 云托管正式部署

## 先分清两类配置

当前项目有两种“环境配置”来源：

1. 服务端环境变量

- 位置：`server/.env` 或云托管环境变量面板
- 作用：控制后端端口、数据库、数据源模式、真实微信登录

2. 小程序端运行配置

- 位置：`miniprogram/config/env.js`
- 作用：控制前台是走 `mock` 还是 `api`、是否切真实微信登录、是否走云托管调用

也就是说：

- 服务端是真正的“环境变量”
- 小程序端当前不是 `process.env`，而是一个显式配置文件

## 一张总表

### 服务端环境变量

| 变量名 | 当前是否使用 | 必填场景 | 默认/示例 | 作用 |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | 已使用 | `prisma` 模式、本地真库、云托管生产 | `mysql://root:password@127.0.0.1:3306/wechat_mini_shop` | Prisma 连接 MySQL |
| `PORT` | 已使用 | 本地服务、云托管 | `3000` | Express 监听端口 |
| `STOREFRONT_DATA_SOURCE` | 已使用 | 所有后端运行场景 | `memory` 或 `prisma` | 控制后端走内存仓库还是真库仓库 |
| `WECHAT_APP_ID` | 已使用 | 真实微信登录 | 空字符串 | `wx.login -> code2Session` 所需的小程序 AppID |
| `WECHAT_APP_SECRET` | 已使用 | 真实微信登录 | 空字符串 | `wx.login -> code2Session` 所需的小程序密钥 |
| `NODE_ENV` | 已使用 | 云托管生产建议显式配置 | `production` | 当前 Dockerfile 会设置，用于运行环境标识 |

### 小程序端运行配置

| 配置项 | 文件位置 | 当前默认值 | 什么时候改 | 作用 |
| --- | --- | --- | --- | --- |
| `mallDataSource` | `miniprogram/config/env.js` | `"mock"` | 联调后端时改成 `"api"` | 控制前台数据来源 |
| `sessionLoginMode` | `miniprogram/config/env.js` | `"mock"` | 接真实微信登录时改成 `"wechat"` | 控制会话获取方式 |
| `requestTransport` | `miniprogram/config/env.js` | `"http"` | 切云托管时改成 `"cloud"` | 控制 HTTP 还是 `wx.cloud.callContainer` |
| `apiBaseUrl` | `miniprogram/config/env.js` | `http://127.0.0.1:3000` | 本地端口变化时修改 | 本地接口地址 |
| `requestTimeout` | `miniprogram/config/env.js` | `8000` | 一般不用改 | 请求超时毫秒数 |
| `enableRequestDebug` | `miniprogram/config/env.js` | `true` | 正式环境可考虑关掉 | 是否打印请求调试日志 |
| `cloud.env` | `miniprogram/config/env.js` | `""` | 切云托管时填写 | 云环境 ID |
| `cloud.service` | `miniprogram/config/env.js` | `""` | 当前不用填 | 预留字段，当前请求层未读取 |
| `cloud.path` | `miniprogram/config/env.js` | `"/api"` | 一般保持默认 | 容器调用的基础路径 |

## 每个服务端变量怎么理解

### `DATABASE_URL`

当前用途：

- `server/prisma.config.ts`
- `server/src/lib/prisma.js`

什么时候必须填：

- 只要后端以 `prisma` 模式运行，就必须填
- 只跑默认 `memory` 模式时，不需要

本地示例：

```bash
DATABASE_URL="mysql://root:password@127.0.0.1:3306/wechat_mini_shop"
```

云上示例：

```bash
DATABASE_URL="mysql://用户名:密码@云数据库主机:3306/数据库名"
```

补充说明：

- 如果云上数据库要求 SSL，需要在连接串里补对应参数
- 当前项目未来生产库方向是腾讯云 MySQL

### `PORT`

当前用途：

- `server/src/index.js`

什么时候需要：

- 本地启动后端时可选
- 云托管生产建议显式配置

默认值：

```bash
PORT=3000
```

补充说明：

- Dockerfile 里已经默认写了 `PORT=3000`
- 本地如果 3000 端口被占用，可以临时改成别的端口，但小程序的 `apiBaseUrl` 也要一起改

### `STOREFRONT_DATA_SOURCE`

当前用途：

- `server/src/repositories/storefront/index.js`

可选值：

```bash
STOREFRONT_DATA_SOURCE=memory
STOREFRONT_DATA_SOURCE=prisma
```

怎么选：

- `memory`
  适合前台演示、快速联调
- `prisma`
  适合真实数据库联调、最小履约联调、后续云上部署

当前最重要的行为差异：

- `memory` 模式仍保留“自动进入待收货”的演示闭环
- `prisma` 模式已经切到后台发货驱动

### `WECHAT_APP_ID`

当前用途：

- `server/src/lib/wechat-auth.js`

什么时候必须填：

- 只有在你要切真实微信登录时才必须填

不填时的表现：

- 服务端会明确报错，提示当前无法启用真实微信登录

### `WECHAT_APP_SECRET`

当前用途：

- `server/src/lib/wechat-auth.js`

什么时候必须填：

- 和 `WECHAT_APP_ID` 一样，只有切真实微信登录时才必须填

补充说明：

- 这是服务端密钥，不应该写进小程序端代码
- 只应该放在 `server/.env` 或云托管环境变量面板

### `NODE_ENV`

当前用途：

- 当前主要由 Dockerfile 提供默认值

推荐值：

```bash
NODE_ENV=production
```

补充说明：

- 本地开发不依赖它
- 云托管生产建议显式设置，避免环境语义不清

## 三种场景怎么配

### 场景 A：本地前台演示

目标：

- 不依赖真数据库
- 优先保住演示和前台点击联调效率

服务端建议：

```bash
PORT=3000
STOREFRONT_DATA_SOURCE=memory
```

`DATABASE_URL`：

- 可不填

微信登录：

- `WECHAT_APP_ID` 不填
- `WECHAT_APP_SECRET` 不填

小程序配置建议：

```js
mallDataSource: "mock" // 或 "api"
sessionLoginMode: "mock"
requestTransport: "http"
apiBaseUrl: "http://127.0.0.1:3000"
```

### 场景 B：本地 Prisma 真库联调

目标：

- 跑真实 MySQL
- 验证订单、履约、售后、真库回归

服务端建议：

```bash
DATABASE_URL="mysql://root:password@127.0.0.1:3306/wechat_mini_shop"
PORT=3000
STOREFRONT_DATA_SOURCE=prisma
WECHAT_APP_ID=""
WECHAT_APP_SECRET=""
```

小程序配置建议：

```js
mallDataSource: "api"
sessionLoginMode: "mock"
requestTransport: "http"
apiBaseUrl: "http://127.0.0.1:3000"
```

补充说明：

- 这是当前最适合验证最小履约能力的模式
- 订单会先停在待发货，需要在 `/admin-console/` 发货

### 场景 C：云托管正式部署

目标：

- 后端部署到微信云托管
- 数据库使用腾讯云 MySQL
- 小程序走云托管调用

服务端建议：

```bash
DATABASE_URL="mysql://用户名:密码@云数据库主机:3306/数据库名"
PORT=3000
NODE_ENV=production
STOREFRONT_DATA_SOURCE=prisma
WECHAT_APP_ID="你的小程序AppID"
WECHAT_APP_SECRET="你的小程序AppSecret"
```

小程序配置建议：

```js
mallDataSource: "api"
sessionLoginMode: "wechat"
requestTransport: "cloud"
cloud: {
  env: "你的云环境ID",
  path: "/api"
}
```

补充说明：

- 当前请求层实际读取的是 `cloud.env` 和 `cloud.path`
- `cloud.service` 目前仍是预留字段，先保持空字符串即可

## 当前推荐的变量收口方式

为了避免后面切云托管时临时补配置，建议现在就按下面收口：

### 1. 本地 `.env` 只保留服务端变量

当前建议格式：

```bash
DATABASE_URL="mysql://root:password@127.0.0.1:3306/wechat_mini_shop"
PORT=3000
STOREFRONT_DATA_SOURCE=memory
WECHAT_APP_ID=""
WECHAT_APP_SECRET=""
```

### 2. 小程序运行配置继续显式放在 `miniprogram/config/env.js`

原因：

- 当前项目不是多环境自动注入方案
- 直接显式修改更符合现在的项目复杂度

### 3. 云托管生产变量只放云控制台，不回写仓库

原因：

- `WECHAT_APP_SECRET` 和正式 `DATABASE_URL` 不应该进 git
- 当前仓库只保留 `server/.env.example`

## 当前还不用新增的变量

基于当前代码状态，下面这些变量现在还不用急着新增：

- 支付商户相关变量
- 自定义公网域名相关变量
- Redis、消息队列、对象存储等扩展基础设施变量
- BI、埋点、Sentry 之类的监控变量

等这些能力真正进入关键路径，再补也不晚。

## 当前最值得马上做的动作

如果只选一个动作，建议就是：

- 先把“本地 / 云托管生产 / 小程序端”三层配置值整理成你自己的正式版本

最小交付标准可以很简单：

1. 确认本地 `server/.env` 的最终模板
2. 确认未来云托管必须填写的 6 个服务端变量
3. 确认小程序正式切云时 `miniprogram/config/env.js` 需要改哪 4 个字段

建议按下面理解：

- 必改：`mallDataSource`
- 必改：`sessionLoginMode`
- 必改：`requestTransport`
- 必填：`cloud.env`
- 一般确认即可：`cloud.path`
- 当前不用填：`cloud.service`

## 相关文件

- `server/.env.example`
- `server/src/index.js`
- `server/src/lib/prisma.js`
- `server/src/lib/wechat-auth.js`
- `server/Dockerfile`
- `miniprogram/config/env.js`
- `docs/cloud-hosting-deployment.md`
