# 环境变量梳理

更新时间：2026-04-08

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
- 作用：控制后端端口、数据库、数据源模式、真实微信登录、是否允许 mock 登录、后台管理员和云托管启动行为

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
| `ALLOW_MOCK_WECHAT_LOGIN` | 已使用 | 本地调试、云托管生产建议显式配置 | `true` / `false` | 控制 `/api/auth/session` 是否还允许 `mock_wechat` 登录 |
| `ADMIN_USERS` | 已使用 | `NODE_ENV=production` 的后台登录 | `'[{"id":"admin-1",...}]'` | 生产环境后台账号与角色；未配置会直接阻止生产启动 |
| `CORS_ORIGINS` | 已使用 | 需要浏览器跨域访问接口时 | `https://admin.example.com` | API 允许跨域的来源白名单，多个用逗号分隔 |
| `ADMIN_SESSION_TTL_MS` | 已使用 | 可选 | `28800000` | 后台登录态有效期，默认 8 小时 |
| `DATABASE_TCP_PROBE_TIMEOUT_MS` | 已使用 | 可选 | `2000` | 云托管启动前数据库 TCP 探测超时时间（毫秒） |
| `NODE_ENV` | 已使用 | 云托管生产建议显式配置 | `production` | 当前 Dockerfile 会设置，用于运行环境标识 |

### 小程序端运行配置

| 配置项 | 文件位置 | 当前仓库值 | 什么时候改 | 作用 |
| --- | --- | --- | --- | --- |
| `mallDataSource` | `miniprogram/config/env.js` | `"api"` | 本地纯演示时可临时改成 `"mock"` | 控制前台数据来源 |
| `sessionLoginMode` | `miniprogram/config/env.js` | `"wechat"` | 本地调试时可临时改成 `"mock"` | 控制会话获取方式 |
| `requestTransport` | `miniprogram/config/env.js` | `"cloud"` | 本地 HTTP 联调时改成 `"http"` | 控制 HTTP 还是 `wx.cloud.callContainer` |
| `apiBaseUrl` | `miniprogram/config/env.js` | `http://127.0.0.1:3000` | 本地端口变化时修改 | 仅在 `requestTransport="http"` 时生效 |
| `requestTimeout` | `miniprogram/config/env.js` | `8000` | 一般不用改 | 请求超时毫秒数 |
| `enableRequestDebug` | `miniprogram/config/env.js` | `false` | 本地排查请求时可临时改成 `true` | 是否打印请求调试日志 |
| `cloud.env` | `miniprogram/config/env.js` | `"shangzhenxing-9gcnl5k01ed8de51"` | 切换云环境时修改 | 云环境 ID |
| `cloud.service` | `miniprogram/config/env.js` | `"shangzhenxing"` | 云托管服务名变化时修改 | 当前请求层会通过 `X-WX-SERVICE` 定位云托管服务 |
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

### `ALLOW_MOCK_WECHAT_LOGIN`

当前用途：

- `server/src/repositories/storefront/session-login.js`
- `server/src/modules/storefront/router.js`

什么时候建议填：

- 本地如果要继续保留演示登录，建议显式写 `true`
- 云托管生产建议显式写 `false`

默认行为：

- 非 `production` 环境默认允许 `mock_wechat`
- `production` 环境默认关闭 `mock_wechat`

推荐值：

```bash
ALLOW_MOCK_WECHAT_LOGIN=true
ALLOW_MOCK_WECHAT_LOGIN=false
```

补充说明：

- 当它为 `false` 时，`/api/auth/session` 会拒绝 `mock_wechat` 登录，并默认走 `wechat_miniprogram`
- 当前仓库已补了 `GET /api/auth/login-readiness`
- 这个接口可以直接检查“真实微信登录是否已配置”和“mock 登录是否已关闭”

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

### `ADMIN_USERS`

当前用途：

- `server/src/admin/auth.js`

什么时候必须填：

- 只要 `NODE_ENV=production`，就必须填

不填时的表现：

- 服务会在启动阶段直接退出，不允许生产环境继续使用演示账号

推荐做法：

1. 先运行 `npm run admin:hash-password -- '你的强密码'`
2. 把输出的 bcrypt hash 填进 `ADMIN_USERS`
3. 再把完整 JSON 放到云托管环境变量里

示例：

```bash
ADMIN_USERS='[{"id":"admin-1","username":"admin","realName":"商城管理员","mobile":"13800000001","passwordHash":"$2b$10$请替换为真实bcrypt哈希","roleCodes":["super_admin"]}]'
```

补充说明：

- 仓库里新增了 `server/.env.cloud.example`，可以直接拿它当生产环境模板
- 如果要配置多账号，继续在同一个 JSON 数组里追加即可

### `CORS_ORIGINS`

当前用途：

- `server/src/index.js`

什么时候建议填：

- 需要从浏览器跨域访问接口时
- 需要从独立域名访问后台或 API 调试页时

示例：

```bash
CORS_ORIGINS="https://admin.example.com,https://shop.example.com"
```

补充说明：

- 小程序通过 `wx.cloud.callContainer` 调后端时，不依赖浏览器 CORS
- 如果后台页面继续和服务端走同域部署，也可以先不额外配置

### `ADMIN_SESSION_TTL_MS`

当前用途：

- `server/src/admin/auth.js`

什么时候需要：

- 想缩短或延长后台登录有效期时

默认值：

```bash
ADMIN_SESSION_TTL_MS=28800000
```

### `DATABASE_TCP_PROBE_TIMEOUT_MS`

当前用途：

- `server/scripts/start-cloud.js`

什么时候需要：

- 云托管连接数据库较慢、需要调大启动探测超时时

默认值：

```bash
DATABASE_TCP_PROBE_TIMEOUT_MS=2000
```

## 三种场景怎么配

### 场景 A：本地前台演示

目标：

- 不依赖真数据库
- 优先保住演示和前台点击联调效率

服务端建议：

```bash
PORT=3000
STOREFRONT_DATA_SOURCE=memory
ALLOW_MOCK_WECHAT_LOGIN=true
```

`DATABASE_URL`：

- 可不填

微信登录：

- `WECHAT_APP_ID` 不填
- `WECHAT_APP_SECRET` 不填
- `ALLOW_MOCK_WECHAT_LOGIN=true`

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
ALLOW_MOCK_WECHAT_LOGIN=true
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
ALLOW_MOCK_WECHAT_LOGIN=false
ADMIN_USERS='[{"id":"admin-1","username":"admin","realName":"商城管理员","mobile":"13800000001","passwordHash":"REPLACE_WITH_BCRYPT_HASH","roleCodes":["super_admin"]}]'
```

小程序配置建议：

```js
mallDataSource: "api"
sessionLoginMode: "wechat"
requestTransport: "cloud"
cloud: {
  env: "shangzhenxing-9gcnl5k01ed8de51",
  service: "shangzhenxing",
  path: "/api"
}
```

补充说明：

- 当前请求层会实际读取 `cloud.env`、`cloud.service` 和 `cloud.path`
- `cloud.service` 必须和云托管控制台里的服务名称保持一致
- 当前仓库里的示例值已经按现在线上配置写成 `shangzhenxing-9gcnl5k01ed8de51 / shangzhenxing`
- 如果你后面改了服务名或切了云环境，这里也要一起改，不然小程序会请求到错误服务
- 如果准备生产变量，优先从 `server/.env.cloud.example` 开始整理
- 服务部署后，可以先访问 `GET /api/auth/login-readiness`；理想返回应是 `wechatMiniProgram.configured=true`、`mockWechat.enabled=false`

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
ALLOW_MOCK_WECHAT_LOGIN=true
```

### 2. 小程序运行配置继续显式放在 `miniprogram/config/env.js`

原因：

- 当前项目不是多环境自动注入方案
- 直接显式修改更符合现在的项目复杂度

### 3. 云托管生产变量只放云控制台，不回写仓库

原因：

- `WECHAT_APP_SECRET` 和正式 `DATABASE_URL` 不应该进 git
- `ADMIN_USERS` 这类生产敏感配置也不应该进 git
- 当前仓库保留 `server/.env.example` 和 `server/.env.cloud.example` 作为模板

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
2. 确认未来云托管必须填写的 8 个服务端变量
3. 确认小程序正式切云时 `miniprogram/config/env.js` 需要改哪 5 个字段

建议按下面理解：

- 必改：`mallDataSource`
- 必改：`sessionLoginMode`
- 必改：`requestTransport`
- 必填：`cloud.env`
- 必填：`cloud.service`
- 一般确认即可：`cloud.path`

## 相关文件

- `server/.env.example`
- `server/.env.cloud.example`
- `server/src/index.js`
- `server/src/lib/prisma.js`
- `server/src/lib/wechat-auth.js`
- `server/src/admin/auth.js`
- `server/Dockerfile`
- `miniprogram/config/env.js`
- `docs/setup/cloud-hosting-deployment.md`
