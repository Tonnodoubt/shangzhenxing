# 微信云托管部署 SOP

更新时间：2026-04-08

这份只讲一件事：

- 现在这个项目，怎么按当前真实配置一步一步部署到微信云托管

如果你只想记一句话：

- 只部署 `wechat-mini-shop/server/`
- 小程序继续用 `miniprogram/`
- 小程序请求走云托管，不走本地 HTTP

## 0. 先记住这 4 件事

1. 云托管里部署的是 `server/`，不是整个仓库。
2. 服务启动命令用 `npm run start:cloud`。
3. 云托管服务名必须和小程序 `cloud.service` 完全一致。
4. 生产环境必须配 `ADMIN_USERS`，而且密码必须是 bcrypt 哈希，不是明文。

## 1. 部署前先准备好

至少准备这几样：

- 云数据库 MySQL 连接串
- 小程序 `AppID`
- 小程序 `AppSecret`
- 一个后台管理员强密码

### 1.1 先生成管理员密码哈希

在 [server/](/Users/tongqianqiu/store/wechat-mini-shop/server) 下执行：

```bash
npm run admin:hash-password -- '你的强密码'
```

把输出的 bcrypt 哈希留好，后面填到 `ADMIN_USERS` 里。

### 1.2 看生产变量模板

模板在：

- [server/.env.cloud.example](/Users/tongqianqiu/store/wechat-mini-shop/server/.env.cloud.example)

当前最关键的变量是：

- `DATABASE_URL`
- `PORT=3000`
- `NODE_ENV=production`
- `STOREFRONT_DATA_SOURCE=prisma`
- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- `ADMIN_USERS`

## 2. 云托管里怎么配

### 2.1 选对环境

当前仓库里的小程序云环境配置是：

- `cloud.env=shangzhenxing-9gcnl5k01ed8de51`

如果你准备继续沿用当前这套联调环境，云托管里就要选这个环境。

### 2.2 服务名要对上

当前仓库里的小程序服务名配置是：

- `cloud.service=shangzhenxing`

所以云托管控制台里的服务名称也必须是：

- `shangzhenxing`

只要这里不一致，小程序就会请求错服务。

### 2.3 上传目录要对

部署时选：

- [wechat-mini-shop/server](/Users/tongqianqiu/store/wechat-mini-shop/server)

不要选整个 `wechat-mini-shop/`，也不要选 `miniprogram/`。

### 2.4 启动配置

当前项目已经在 Dockerfile 里写好了：

- 端口：`3000`
- 启动命令：`npm run start:cloud`

对应文件：

- [Dockerfile](/Users/tongqianqiu/store/wechat-mini-shop/server/Dockerfile)

如果云托管界面需要你手填，按这两个值填。

## 3. 环境变量怎么填

可以直接按下面这份思路填：

```bash
DATABASE_URL="mysql://用户名:密码@云数据库主机:3306/数据库名"
PORT=3000
NODE_ENV=production
STOREFRONT_DATA_SOURCE=prisma
WECHAT_APP_ID="你的小程序AppID"
WECHAT_APP_SECRET="你的小程序AppSecret"
ADMIN_USERS='[{"id":"admin-1","username":"admin","realName":"商城管理员","mobile":"13800000001","passwordHash":"这里换成真实 bcrypt 哈希","roleCodes":["super_admin"]}]'
CORS_ORIGINS=""
ADMIN_SESSION_TTL_MS=28800000
DATABASE_TCP_PROBE_TIMEOUT_MS=2000
```

这里最容易填错的是 `ADMIN_USERS`：

- 这是一个 JSON 字符串
- `passwordHash` 里放的是 bcrypt 哈希
- 不能写“替换成bcrypt哈希”这种占位文字

## 4. 小程序端要确认什么

看这个文件：

- [env.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/config/env.js)

当前应该是这组配置：

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

这 3 个点最关键：

1. `requestTransport` 必须是 `cloud`
2. `cloud.service` 必须和云托管服务名一致
3. `cloud.path` 当前保持 `/api`

## 5. 部署后先验收什么

不要一上来就全链路乱点，先按这个顺序验：

### 5.1 先看健康检查

打开云托管服务域名后，访问：

- `/health`

正常时应该返回：

- `ok: true`

### 5.2 再看后台控制台

打开：

- `/admin-console/`

能打开页面，说明静态资源和服务路由都起来了。

### 5.3 再试后台登录

用你刚才配置在 `ADMIN_USERS` 里的账号密码登录。

如果密码不对，优先回查：

- `ADMIN_USERS` 是否已更新
- `passwordHash` 是否真的是 bcrypt 哈希

### 5.4 最后再试小程序链路

建议最少走这 4 步：

1. 小程序首页能正常请求商品
2. 商品详情能打开
3. 能下单
4. 后台能看到订单

## 6. 这一步最常见的 4 个坑

### 6.1 `Back-off restarting failed container`

通常先查这几个：

- `ADMIN_USERS` 写错
- `DATABASE_URL` 连不上
- 服务启动命令不对

### 6.2 `Readiness probe failed`

通常说明容器没真正起来。

优先看启动日志，常见原因还是：

- 数据库不通
- 启动时报错直接退出

### 6.3 `接口不存在`

优先查：

- 小程序 `cloud.service` 和云托管服务名是不是一致
- `cloud.path` 是不是 `/api`
- 你访问的是不是服务根路径，而不是实际接口路径

### 6.4 后台登录不上

优先查：

- `ADMIN_USERS` 是不是生产环境真的配进去了
- `passwordHash` 是不是 bcrypt 哈希
- 账号名是不是你自己改过

## 7. 当前最推荐的部署理解

当前最稳的方式不是“先上线再慢慢补”，而是：

1. 后端云托管按 `prisma` 跑
2. 小程序按 `cloud` 调容器
3. 后台账号明确配好
4. 先把商品、下单、订单、发货这条主链路跑稳

如果你后面只想按操作继续走，下一份该看的文档是：

- [cloud-hosting-deployment.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/setup/cloud-hosting-deployment.md)

如果你是要补变量，先看：

- [environment-variables.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/setup/environment-variables.md)
