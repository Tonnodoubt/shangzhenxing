# 项目状态与下一步

更新时间：2026-04-02

这份文档现在合并了原来的：

- `remaining-tasks.md`
- `next-phase-roadmap.md`
- `go-live-checklist.md`

如果你只想快速恢复上下文，直接看这一篇就够了。

## 一句话结论

当前项目已经到“本地业务闭环基本完成，开始准备正式上线”的阶段。

代码侧已经具备：

- 小程序商城主链路
- `memory / prisma` 双模式
- Node/Express 后端
- Prisma + MySQL 真库回归
- 最小履约后台第一版
- 一级分佣归因第一版

当前真正卡节奏的，不再是本地开发，而是：

1. 生产环境变量
2. 主体注册与小程序备案
3. 真实微信登录
4. 腾讯云 MySQL + 微信云托管
5. 微信支付

## 当前已经完成

下面这些现在都算已完成，不要再反复回头补：

- 前台 19 个页面和基础主链路
- `mock` / `api` 双模式
- 后端 `router -> service -> repository` 分层
- `POST /api/auth/session`、`GET /api/me`、`POST /api/auth/logout`
- 小程序端 `sessionToken`、自动带 `Authorization`、`401` 自动补会话
- `wx.login + code2Session` 预埋链路
- 本地 Docker MySQL、Prisma schema / migration / seed
- `STOREFRONT_DATA_SOURCE=memory|prisma`
- 最小履约控制台 `/admin-console/`
- 管理员登录、订单查看、发货、售后审核
- 一级分佣第一版：inviter 绑定、订单归因快照、确认收货后给邀请人记佣、海报分享带参

## 当前边界

当前最容易搞混的是 `memory` 和 `prisma` 的行为差异：

- `memory` 模式偏演示，新订单会自动进入待收货
- `prisma` 模式偏真实履约，新订单会先停在待发货
- `prisma` 模式下，需要在履约控制台发货后，订单才会进入待收货

所以：

- 演示前台主链路，用 `memory`
- 验证真实落库、发货、售后、分佣，用 `prisma`

## 当前代码护栏

这轮已经补上的最小工程护栏：

- 服务端新增 `npm run lint`
- `lint` 当前覆盖 `server/src/`、`server/tests/`、`server/scripts/` 里的 JavaScript 文件
- 重点拦截基础语法问题、未声明全局、未使用变量这类低成本但高价值的问题
- `server/src/repositories/storefront/prisma.js` 已完成九刀拆分，后台管理、分销、优惠券、订单/售后、商品浏览、购物车/地址、登录态/邀请绑定、个人中心、mapper/helper 已分别独立到 `prisma-admin.js`、`prisma-distribution.js`、`prisma-coupon.js`、`prisma-order.js`、`prisma-catalog.js`、`prisma-cart.js`、`prisma-session.js`、`prisma-profile.js`、`prisma-mappers.js`
- `server/src/repositories/storefront/prisma.js` 已从约 `3753` 行收敛到 `288` 行，主仓库现在基本只保留装配职责
- `server/public/admin-console/index.html` 已拆成 `index.html`、`admin-console.css`、`admin-console.js` 三个职责文件，后台不再是单 HTML 承载全部前端逻辑
- 已补两批 `memory / prisma` 契约式回归，当前覆盖 `session / catalog / address / cart / coupon / checkout / order / aftersale / profile / distribution`
- 契约回归顺手打出了一个真实漂移：`prisma` 售后返回里的 `orderId` 之前是内部主键，现在已修正为前台公共单号
- 默认 `npm test` 现在同时覆盖 memory API 回归、`prisma-admin`、`prisma-distribution`、`prisma-coupon`、`prisma-order`、`prisma-catalog`、`prisma-cart`、`prisma-session`、`prisma-profile`、`prisma-mappers`、`storefront-contract`、`session-login` 测试

当前建议按下面顺序治理技术债，不要并行大拆：

1. 先处理 [server/src/shared/mall.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/shared/mall.js) 和 [miniprogram/services/mall.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/services/mall.js) 的重复源问题
2. 再按工作区继续细拆 [admin-console.js](/Users/tongqianqiu/store/wechat-mini-shop/server/public/admin-console/admin-console.js)
3. 然后补更细的跨模式回归边界，比如异常码、空态和极端输入
4. 最后再考虑把 `prisma.js` 里的默认 seed / 常量配置继续外移，进一步降低主入口噪音

如果要看为什么这么排，直接看：

- [code-health-audit.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/current/code-health-audit.md)

## 当前关键路径

### 1. 现在就能做

- 收口生产环境变量
- 明确正式环境配置切换方案
- 整理主体、备案、类目、管理员资料

### 2. 主体确定后立刻做

- 注册并认证小程序账号
- 提交小程序备案
- 补 `WECHAT_APP_ID`
- 补 `WECHAT_APP_SECRET`

### 3. 正式上线前必须做

- 准备腾讯云 MySQL，拿到真实 `DATABASE_URL`
- 部署 `server/` 到微信云托管
- 小程序切到 `wx.cloud.callContainer`
- 真实微信登录联调
- 微信支付接入、回调和回查
- 正式环境回归、提审、发布

## 上线前硬前置

如果按“最快上线”理解，真正的串行阻塞主要是这几项：

1. 主体与小程序账号
2. 小程序备案
3. 云资源和生产环境变量
4. 真实微信登录参数
5. 微信支付商户号与绑定关系

其中最容易拖长总周期的，通常不是代码，而是：

- 主体决策
- 备案审核
- 支付资质和商户绑定

## 当前不要再做什么

为了避免继续发散，当前建议暂停这些动作：

- 不要再重复搭本地 MySQL 和 Prisma 基础设施
- 不要继续扩“最小履约”的本地功能面
- 不要现在就把直播、官网、跨端拉进主线
- 不要在真实登录和云资源没就绪前抢做微信支付

## 本地可用入口

### 前台联调

- 小程序目录：`miniprogram/`
- 本地服务目录：`server/`

### 最小履约控制台

- 地址：`http://127.0.0.1:3000/admin-console/`
- 履约账号：`order / Order@123456`
- 超级管理员：`admin / Admin@123456`

### 常用命令

在 `server/` 下执行：

- `npm run lint`
- `npm run db:local:up`
- `npm run prisma:migrate:deploy`
- `npm run prisma:seed:storefront`
- `npm run storefront:regression:prisma`
- `STOREFRONT_DATA_SOURCE=prisma npm run dev`

## 当前已经验证过的内容

本地已实际通过：

- `npm run test:api`
- `npm run test:prisma`
- `npm run prisma:migrate:deploy`
- `npm run storefront:regression:prisma`

已经验证过的业务链包括：

- 登录态
- 商品、购物车、下单
- 优惠券领取、使用、取消退券
- 后台发货
- 售后提交与审核
- 确认收货后分佣记账
- 团队 / 佣金 / 海报读取

## 下一步只做什么

如果接下来只推进一件事，建议就是：

- 先把生产环境变量收口，并同步启动主体注册与小程序备案准备

原因很简单：

- 本地真库和最小履约已经够用
- 现在最容易卡上线节奏的是现实前置，不是代码骨架
- 提前把账号、备案和环境变量准备好，后面切云托管会顺很多

## 恢复上下文时先看哪几份

- 当前状态：[project-status-snapshot.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/current/project-status-snapshot.md)
- 功能现状：[feature-status-matrix.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/current/feature-status-matrix.md)
- 环境变量：[environment-variables.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/setup/environment-variables.md)
- 文档总索引：[README.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/README.md)
