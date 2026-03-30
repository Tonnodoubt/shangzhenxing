# 微信云托管部署说明

这份说明只讲“真实部署”下该怎么理解当前项目，不再把小程序前台和后端混在一起。

补一句当前最容易混淆的边界：

- 这份文档偏“云上正式部署”
- 如果你现在是在推进本地真库联调，优先看 `docs/remaining-tasks.md`

## 先分清两个部分

这个项目实际上有两套产物：

1. 小程序前台
   目录：`miniprogram/`
   作用：提交到微信开发者工具、上传小程序代码

2. 后端服务
   目录：`server/`
   作用：部署到微信云托管，提供 `/api/*` 接口

所以：

- 小程序代码本身不需要 Docker
- 需要容器化的是 `server/` 这部分后端服务

## 当前仓库已经准备好的部署要素

- 后端启动入口：[server/src/index.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/index.js)
- 云托管容器文件：[server/Dockerfile](/Users/tongqianqiu/store/wechat-mini-shop/server/Dockerfile)
- Prisma 配置：[server/prisma.config.ts](/Users/tongqianqiu/store/wechat-mini-shop/server/prisma.config.ts)
- Prisma 数据模型：[server/prisma/schema.prisma](/Users/tongqianqiu/store/wechat-mini-shop/server/prisma/schema.prisma)
- 首版迁移脚本：[migration.sql](/Users/tongqianqiu/store/wechat-mini-shop/server/prisma/migrations/20260329132000_init/migration.sql)
- 环境变量示例：[server/.env.example](/Users/tongqianqiu/store/wechat-mini-shop/server/.env.example)

## 当前真实状态

这部分很重要，先说清楚现在到底到了哪一步：

- 后端已经支持 `memory` 和 `prisma` 两种 storefront 数据源
- 当前默认仍是 `memory`
- `GET /health` 会返回当前的 `storefrontRepositoryMode`
- Prisma 仓库已经不是空骨架，前台用户态主模块已补齐
- 登录态基础设施第一批也已补上：`/api/auth/session`、`/api/me`、`/api/auth/logout`
- `wx.login + code2Session` 的代码路径也已经预埋好，但默认开关仍保持 `mock`
- 真实云上 `DATABASE_URL` 还没有，所以现在还不能正式切到真库模式

也就是说：

- 真实部署路径已经铺好了
- 但当前运行中的演示环境，仍然是以内存态数据为主

## 真实部署时的建议顺序

如果按“本地先验证，再上云”的顺序理解，建议这样看：

0. 本地先用 Docker MySQL 把 Prisma 真库回归跑通

1. 先准备真实 MySQL
   建议直接按云上 MySQL 来走，不再依赖本地内存态数据。

2. 在云托管环境里配置环境变量
   最关键的是：
   `DATABASE_URL`
   `PORT`
   `NODE_ENV=production`
   `STOREFRONT_DATA_SOURCE=prisma`
   `WECHAT_APP_ID`
   `WECHAT_APP_SECRET`

3. 用 `server/` 目录部署后端容器
   当前容器启动命令已经配置为：
   `npm run start:cloud`

4. 让小程序前台改走云托管调用
   文件：[env.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/config/env.js)

   需要把：
   `requestTransport` 改成 `cloud`

   并填写：
   `cloud.env`
   `cloud.service`
   `cloud.path`

5. 小程序里继续通过 `wx.cloud.callContainer` 请求后端
   当前这条能力已经在请求层预留好了：
   [request.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/services/request.js)

## 备案边界和快速上线的关系

这里要把两件事分开看：

- 小程序备案
- 自定义公网域名的 ICP 备案

这两件事不是一回事。

### 1. 小程序备案不能当作“上线后再补”

如果目标是让真实用户在微信里正式使用小程序，那么小程序备案仍然要走在前面。

微信官方“小程序备案操作指引”写得很明确：备案流程包含“平台初审 -> 工信部短信核验 -> 通管局审核”，并且“备案成功后，才可以进入下一步版本发布等流程”。

也就是说：

- 还没确定主体、还没注册小程序账号时，可以继续开发、联调、真机预览
- 但还不能把它当成“正式对外上线”的状态

官方参考：

- https://developers.weixin.qq.com/miniprogram/product/record_guidelines.html

### 2. 自定义域名 ICP 备案可以视接入方式决定是否暂缓

如果后端挂在微信云托管，并且小程序前台一直通过 `wx.cloud.callContainer` 访问容器服务，那么你前期可以先不绑定自定义公网域名。

这意味着：

- 前期不一定要先做“自定义域名 ICP 备案”
- 先把后端容器、数据库、接口链路跑起来是可行的

但要注意官方限制：

- 云托管默认公网域名“可用于测试和验证服务”，不建议用于线上生产
- 一旦要绑定自定义域名用于生产访问，域名“需要完成域名备案，否则无法访问”

官方参考：

- https://cloud.tencent.com.cn/document/product/1243/77191
- https://cloud.tencent.com.cn/document/product/876/113602

### 3. 对当前项目更贴近现实的上线理解

在当前阶段，更稳的路径是：

1. 先把 `server/` 的容器化、Prisma、真实 MySQL、云托管部署打通
2. 前台继续按 `wx.cloud.callContainer` 对接后端
3. 等主体确定并注册小程序后，尽快提交小程序备案
4. 先不急着接自定义公网域名，避免额外增加一轮 ICP 域名备案时间
5. 等后面确实需要官网、H5、开放 API 或品牌域名时，再补自定义域名备案

这样做的核心不是“完全绕过备案”，而是：

- 必做的小程序备案照做
- 能后置的自定义域名备案先后置

## Prisma 模式现在已经做到哪了

当前 Prisma 仓库已经覆盖这些能力：

- 商品与分类读取
- 购物车读写
- 地址读写与默认地址切换
- 订单创建、订单列表、订单详情、订单状态更新
- 优惠券领取、选券、清券、下单核销
- 售后申请与售后状态读取
- 用户资料读取与模拟授权
- 分销中心、团队、佣金、海报读取

另外，为了让前台在后台页面尚未开始时也能继续跑业务闭环，当前用户态还补了几条过渡规则：

- `memory` 模式下，新下单订单会在短时间后自动进入“待收货”
- 待发货订单取消时，会退回本单已用优惠券
- 确认收货后，会给当前账号累积一笔待结算佣金

同时，当前已经补了最小履约能力：

- 本地履约控制台 `/admin-console/`
- 管理员登录
- 后台发货并记录物流信息
- 售后审核与备注回写

所以更准确的理解应该是：

- `memory` 模式仍保留前台闭环过渡机制
- `prisma` 模式已经开始走后台发货驱动
- 更完整的运营后台和云上部署仍是后续工作

- 结构上已经具备“真实部署骨架”
- 核心商城数据和前台用户态主模块已有 Prisma 实现
- 但默认运行模式仍然保持 `memory`
- 等拿到真实 `DATABASE_URL` 后，再把 `STOREFRONT_DATA_SOURCE=prisma`

## 以后拿到云上数据库连接串时，要准备哪些信息

至少要准备这 5 个值：

1. 数据库主机地址
2. 端口
3. 数据库名
4. 用户名
5. 密码

最后拼成：

```bash
DATABASE_URL="mysql://用户名:密码@主机:端口/数据库名"
```

如果云上数据库要求 SSL，再额外补对应连接参数。

## 未来真正切到 Prisma 模式时怎么切

1. 把云上 MySQL 的真实连接串填进 `DATABASE_URL`
2. 在云托管环境变量里把 `STOREFRONT_DATA_SOURCE` 改成 `prisma`
3. 保持启动命令为 `npm run start:cloud`
4. 让容器启动时执行 `prisma migrate deploy`
5. 配置 `WECHAT_APP_ID / WECHAT_APP_SECRET`
6. 把小程序 `miniprogram/config/env.js` 里的 `sessionLoginMode` 改成 `wechat`
7. 部署后先访问 `/health`，确认 `storefrontRepositoryMode` 已变成 `prisma`

在这之前，继续保持 `memory` 就行，不会影响你现在的小程序联调。

## 现在没有 DATABASE_URL 时，应该怎么继续

当前最稳的做法不是停下来等，而是继续做这些不依赖云上连接串的工作：

1. 先用本地 Docker MySQL 跑 Prisma 真库联调
2. 重点回归优惠券、售后、分销相关 Prisma 链路
3. 验证 Prisma 的 `user_sessions`
4. 补上 `WECHAT_APP_ID / WECHAT_APP_SECRET`
5. 再把小程序 `sessionLoginMode` 从 `mock` 改成 `wechat`
6. 在真正上云前，继续保留 `memory` 作为稳定演示兜底

这样你既不会偏离真实上线路线，也不会因为云资源还没就位就卡住。

## 本地开发和真实部署的关系

当前建议这样理解：

- 本地联调阶段：继续保留 `mock` 和 `api`
- 真实部署阶段：后端上云托管，数据库换真实 MySQL，小程序前台切 `cloud`

这样你既不会丢掉当前已经跑通的演示环境，也不会偏离真实上线路线。
