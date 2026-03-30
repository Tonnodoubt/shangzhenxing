# 项目技术栈说明

这份文档只回答一件事：当前这个微信商城项目，实际用了什么技术栈，以及哪些能力已经接上、哪些还没正式接上。

## 一句话总结

这是一个：

- 前端用原生微信小程序
- 后端用 Node.js + Express
- 数据层用 Prisma 7 + MySQL
- 本地开发支持 `memory | prisma`
- 目标部署到微信云托管

的商城项目。

## 1. 前端技术栈

前端目录：

- `miniprogram/`

当前采用的是原生微信小程序技术栈，不是 `uni-app`、不是 `Taro`、也不是 React / Vue 小程序方案。

具体表现为：

- 页面结构：`WXML`
- 页面样式：`WXSS`
- 页面逻辑：`JavaScript`
- 页面与全局配置：`JSON`

项目入口配置：

- `miniprogram/app.json`
- `project.config.json`

当前页面规模：

- 首页
- 分类
- 搜索
- 商品详情
- 购物车
- 结算
- 支付结果
- 订单列表
- 订单详情
- 售后
- 个人中心
- 地址列表 / 编辑
- 领券
- 分销中心
- 团队
- 佣金
- 海报
- 授权

## 2. 小程序请求与环境配置

当前小程序有两层开关：

1. 数据来源开关

- `mallDataSource: "mock" | "api"`

2. 网络传输方式开关

- `requestTransport: "http" | "cloud"`

当前默认配置文件：

- `miniprogram/config/env.js`

当前能力：

- 本地联调可走 `http`
- 后续可切 `wx.cloud.callContainer`
- 请求层已支持自动带 `Authorization`
- 登录态失效时可自动补会话并重试

请求层文件：

- `miniprogram/services/request.js`

## 3. 后端技术栈

后端目录：

- `server/`

当前后端采用：

- Node.js
- Express 4
- CommonJS

核心依赖可在 `server/package.json` 看到：

- `express`
- `dotenv`
- `prisma`
- `@prisma/client`
- `mariadb`
- `@prisma/adapter-mariadb`

当前没有使用：

- TypeScript
- NestJS
- Koa

另外已经补了一套最小后台入口：

- 纯静态 HTML 管理台，由 Express 直接托管
- 本地入口：`/admin-console/`
- 当前只覆盖订单查看、发货、售后审核

## 4. 后端架构方式

当前后端已经按业务层次拆成：

- `router`
- `service`
- `repository`

也就是说，现在不是把所有逻辑都堆在一个接口文件里，而是已经做成了比较清晰的后端分层。

这套分层当前主要服务于前台商城业务。

## 5. 数据库与持久化技术栈

当前数据库技术栈是：

- Prisma 7
- MySQL

Prisma schema 文件：

- `server/prisma/schema.prisma`

当前已经具备：

- Prisma Client
- migration
- `prisma generate`
- `prisma migrate dev`
- `prisma migrate deploy`

当前项目支持两种 storefront 数据源模式：

- `memory`
- `prisma`

切换环境变量：

- `STOREFRONT_DATA_SOURCE=memory|prisma`

其中：

- `memory` 适合演示和快速联调
- `prisma` 适合真实数据库联调和后续上线

## 6. 登录态与鉴权

当前登录态采用的是：

- 本地 `sessionToken`
- 请求头 `Authorization: Bearer <token>`

已完成接口：

- `POST /api/auth/session`
- `GET /api/me`
- `POST /api/auth/logout`

当前默认仍然是：

- mock session

但已经预埋：

- `wx.login`
- 服务端 `code2Session`

也就是说：

- 登录态基础设施已就位
- 真实微信登录代码路径已埋好
- 只是还没切到正式微信账号参数

## 7. 部署技术栈

当前部署方向是：

- 后端容器化
- 部署到微信云托管

相关文件：

- `server/Dockerfile`

启动命令：

- `npm run start:cloud`

当前建议的环境分层是：

1. 本地开发

- 小程序：微信开发者工具 / 真机预览
- 后端：本机运行 `server/`
- 数据库：本机 Docker MySQL
- 本地编排文件：`server/compose.local-mysql.yml`
- 本地真库常用命令：`npm run db:local:up`、`npm run prisma:migrate:deploy`、`npm run prisma:seed:storefront`、`npm run storefront:regression:prisma`

2. 真实部署

- 小程序：微信正式环境
- 后端：微信云托管
- 数据库：腾讯云 MySQL

## 8. 当前已经接上的真实业务层能力

从仓库状态看，当前已经接上或已具备 Prisma 实现的主要能力包括：

- 商品与分类读取
- 购物车读写
- 地址 CRUD 和默认地址切换
- 订单创建、列表、详情、状态更新
- 优惠券领取、选券、清券、下单核销
- 售后申请与售后状态读取
- 用户资料读取与模拟授权
- 分销中心、团队、佣金、海报读取

另外，用户侧还补了一层过渡闭环：

- `memory` 模式下，新订单会自动进入待收货
- 待发货订单取消时会退回已用优惠券
- 确认收货后会累积分销账单

同时，`prisma` 模式已经补了最小履约能力：

- 管理员登录
- 订单列表和订单详情查看
- 后台发货并记录物流公司 / 单号
- 售后列表查看与通过 / 驳回

也就是说，现在要更准确地区分两条路径：

- `memory`：继续偏前台演示和快速联调
- `prisma`：开始按真实履约流程联调

## 9. 当前还没有正式接上的能力

截至当前仓库状态，这些能力还没真正开始或还没正式切真：

- 真实微信登录联调
- 微信支付
- 真实云上 `DATABASE_URL`
- 微信云托管正式部署
- 更完整的后台管理页面
- 更完整的履约、运营和 BI 系统
- 正式分销归因和运营后台规则

## 10. 这套技术栈适不适合当前项目

对当前这个项目来说，这套技术栈是合理的，原因很直接：

- 当前目标是先把微信小程序商城跑通，不是多端统一开发
- 原生小程序更贴微信生态，联调路径更直
- Node.js + Express + Prisma + MySQL 足够支撑当前商城 MVP
- 后续平滑切到微信云托管和腾讯云 MySQL 也比较自然

所以当前更准确的理解应该是：

- 这不是“跨端型技术栈”
- 而是“单微信小程序优先、后端独立、可往真实生产环境平移”的技术栈
