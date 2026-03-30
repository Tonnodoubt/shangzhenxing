# 当前剩余任务清单

这份文档只保留一件事：

- 现在这个项目还剩什么没做

已经完成的前台补强、mock / api 联调、Prisma 仓库补齐、登录态第一批、用户侧订单闭环，不再放进当前主任务里重复跟踪。

## 当前判断

当前项目的目标是：

- 先把微信小程序商城单端上线
- 暂时不做跨端
- 暂时不把官网放进关键路径
- 暂时不把自定义公网域名放进关键路径

所以当前关键路径只围绕：

- 真数据库
- 云托管部署
- 小程序主体与备案
- 真实微信登录
- 微信支付
- 生产环境变量梳理

## 已经完成，可从主任务里移除的事项

下面这些现在都不再是当前主任务：

- 前端 19 个页面骨架
- `mock` / `api` 双模式
- 主链路“首页 -> 商品详情 -> 加购 -> 购物车 -> 结算 -> 下单 -> 订单 -> 订单详情”
- 微信开发者工具 `api` 联调
- 手机真机预览第一轮回归
- 首页 / 个人中心 / 分销中心第一轮文案收口
- 后端 `router -> service -> repository` 结构
- Prisma 7 + MySQL schema / migration / Dockerfile / `start:cloud`
- `STOREFRONT_DATA_SOURCE=memory|prisma`
- 登录态第一批：`/api/auth/session`、`/api/me`、`/api/auth/logout`
- 小程序端本地 `sessionToken`、自动带 `Authorization`、`401` 自动补会话
- `wx.login + code2Session` 预埋
- 优惠券 / 售后 / 分销团队 / 佣金 / 海报 Prisma 仓库实现
- 用户侧订单过渡闭环：自动进入待收货、取消退券、确认收货累积分销账单
- 本地 Docker MySQL 编排：`server/compose.local-mysql.yml`
- 本地真库初始化：`npm run prisma:seed:storefront`
- `STOREFRONT_DATA_SOURCE=prisma` 真库回归脚本：`npm run storefront:regression:prisma`
- 最小履约能力第一版：本地履约控制台 `/admin-console/`、管理员登录、订单查看、发货、售后审核
- Prisma 真库履约回归：已覆盖待发货订单读取、后台发货、售后待审核读取、后台审核回写

## 当前剩余任务

### A. 现在就能做

这些不依赖主体和微信账号，可以马上推进。

1. 生产环境变量梳理

- 先把本地、测试、未来线上需要的环境变量列清楚
- 避免后面切云托管时临时补配置

## 本地真库现状

这部分已经不是“待做”，而是已经可以直接执行：

1. 启本地 MySQL

- 进入 `server/`
- 执行 `npm run db:local:up`

2. 跑 migration

- 执行 `npm run prisma:migrate:deploy`

3. 补商品种子

- 执行 `npm run prisma:seed:storefront`

4. 跑 Prisma 真库回归

- 执行 `npm run storefront:regression:prisma`

5. 本地以 Prisma 模式启动服务

- 执行 `STOREFRONT_DATA_SOURCE=prisma npm run dev`

6. 打开最小履约控制台

- 浏览器访问 `http://127.0.0.1:3000/admin-console/`
- 默认履约账号：`order / Order@123456`
- 超级管理员账号：`admin / Admin@123456`

补一条当前已经发生的变化，避免按旧认知继续联调：

- `memory` 模式仍保留“自动进入待收货”的前台过渡规则，方便演示
- `prisma` 模式已经切到“后台发货驱动”，订单会先停留在待发货，需在履约控制台发货后再进入待收货

### B. 主体确定后立刻做

这部分依赖小程序主体和账号。

1. 注册小程序账号
2. 提交小程序备案
3. 确认小程序类目和需要的资质
4. 补 `WECHAT_APP_ID`
5. 补 `WECHAT_APP_SECRET`

### C. 正式上线前必须完成

这部分是公开上线前的硬任务。

1. 腾讯云 MySQL

- 准备正式库
- 拿到真实 `DATABASE_URL`
- 跑生产 migration

2. 微信云托管部署

- 部署 `server/`
- 配环境变量
- 小程序请求切到 `wx.cloud.callContainer`

3. 真实微信登录联调

- 把 `sessionLoginMode` 从 `mock` 切到 `wechat`
- 验证 `wx.login -> /api/auth/session -> code2Session -> sessionToken`

4. 微信支付

- 下单
- 拉起支付
- 支付结果回写
- 订单状态回查

5. 上线前回归

- 登录
- 下单
- 支付
- 取消
- 确认收货
- 售后
- 分销账单

## 可以后置的事项

这些不在当前首发关键路径里。

- 官网
- H5 商城
- 跨端改造
- 自定义公网域名
- 自定义域名 ICP 备案
- 更完整的后台页面
- 更重的运营系统和 BI

## 推荐执行顺序

按“最快上线”理解，当前建议顺序是：

1. 生产环境变量梳理
2. 确定主体并注册小程序
3. 小程序备案
4. 真实微信登录
5. 腾讯云 MySQL
6. 微信云托管部署
7. 微信支付
8. 上线前联调与提审

## 当前最值得马上做的下一件事

如果只选一个动作，建议就是：

- 开始梳理生产环境变量，并同步推进主体注册与小程序备案准备

原因很简单：

- 最小履约能力已经补到“可登录、可发货、可审核售后”的程度
- 现在最容易卡住上线节奏的，已经从本地开发转成主体、备案、真实登录和云上配置
- 提前把环境变量和主体资料收口，后面切云托管会更顺
