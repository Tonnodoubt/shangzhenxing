# 微信商城小程序

这是一个原生微信小程序的基础商城骨架，已经放在 `/Users/tongqianqiu/store/wechat-mini-shop` 目录下，后续可以直接在这个目录继续迭代。

## 当前包含

- 首页
- 分类页
- 搜索页
- 商品详情页
- 购物车页
- 结算页
- 支付结果页
- 订单页
- 订单详情页
- 售后申请页
- 我的页
- 地址列表与编辑页
- 领券中心页
- 分销中心页
- 我的团队页
- 佣金明细页
- 分销海报页
- 登录授权页
- 本地 Mock 数据
- 本地 Node API 骨架

## 适合当前阶段的原因

- 不依赖外部开源商城代码
- 结构轻，方便你后面一点点改
- 可以直接导入微信开发者工具
- 先把交易闭环骨架跑通，再补支付、接口和后台

## 导入方式

1. 打开微信开发者工具
2. 选择“导入项目”
3. 项目目录选择 `/Users/tongqianqiu/store/wechat-mini-shop`
4. 当前 `AppID` 使用项目里的配置
5. 真正上线前替换成你自己的小程序 `AppID`

## 当前进度

如果你现在只想看“还剩什么没做”，优先看：

- `docs/remaining-tasks.md`

如果你现在只想快速确认“项目做到哪里了”，优先看：

- `docs/project-status-snapshot.md`

- 前端 19 个页面骨架已完成并可在微信开发者工具中继续迭代
- `mock` 模式和 `api` 模式都已跑通
- 本地服务 `GET /health` 返回成功
- 主链路“首页 -> 商品详情 -> 加购 -> 购物车 -> 结算 -> 下单 -> 订单 -> 订单详情”已基本跑通
- 已完成一轮微信开发者工具内的 `api` 主链路点击联调，当前未发现可复现的业务请求超时
- 已完成一轮手机真机预览回归，主链路、主要页面样式与输入交互表现正常，可认为前台基础盘已打稳
- 首页、个人中心、分销中心已完成一轮文案与入口收口，前台观感更接近真实商城演示版本
- 后端已从“直接复用前端 mock 逻辑”整理为 `router -> service -> repository` 的 storefront 结构
- 已补 `Prisma 7 + MySQL` 数据模型、首版 migration、`.env.example`、云托管容器文件和 `start:cloud` 启动命令
- 已加入 `STOREFRONT_DATA_SOURCE=memory|prisma` 仓库切换，当前默认仍是 `memory`，不会影响现有前台联调
- Prisma 仓库已补到第二批实现，已覆盖商品、分类、购物车、地址、订单、优惠券、售后、个人中心、分销团队、佣金、海报、模拟授权等前台用户态模块
- 已补第一批登录态基础设施：`POST /api/auth/session`、`GET /api/me`、`POST /api/auth/logout`
- 小程序 `api` 模式已支持本地保存 `sessionToken`、请求自动带 `Authorization`、`401` 后自动补会话并重试一次
- 已补 `wx.login + code2Session` 预埋链路：前端支持切到 `sessionLoginMode="wechat"`，后端支持用微信 `code` 换 `openid`
- 已补最小履约控制台 `/admin-console/`，支持管理员登录、查看订单、发货、处理售后
- 当前仍未接真实云上数据库、真实微信登录、真实微信支付；云上的 `DATABASE_URL` 也还没有

## 本轮前台补强摘要

这轮重点没有继续扩后台和支付，而是优先把前台页面做稳、做完整、做得更像可演示版本。

- 页面状态补强
  已为首页、分类、搜索、商品详情、购物车、结算、订单列表、订单详情、支付结果、售后申请、个人中心、授权、领券中心、地址列表、地址编辑、分销中心、团队、佣金、海报等页面补上 `loading / error / empty / notFound` 等状态兜底。
- 操作防误触补强
  已补按钮 `loading / disabled`、重复点击拦截、删除确认、取消订单确认、确认收货确认、加购和提交时的操作中态。
- 边界情况补强
  已处理缺少页面参数、商品不存在、订单不存在、地址不存在、购物车为空、没有默认地址、优惠券不可选、售后重复申请、订单暂不可售后等情况。
- 展示细节补强
  首页补了首屏徽标、运营 banner、商品卖点层级；分销中心补了等级进度、动作卡片和新手引导；商品详情补了指标概览、权益说明、图文详情；订单详情补了订单进度、服务说明和售后入口表达；售后页补了商品金额、收货信息和处理流程上下文。
- 页面联动补强
  个人中心里的“售后服务”已从 placeholder 改为真实入口；订单列表已前置“申请售后 / 查看售后”快捷入口。

## 本轮后端准备摘要

这轮后端没有急着接真实支付，而是先按微信云托管的真实部署路径把基础设施垫好，目的是后面接数据库和登录态时不容易卡住。

- 结构整理
  `server/src/index.js` 现在只负责启动和挂路由，商城接口已拆到 `server/src/modules/storefront/`，数据来源再下沉到 `server/src/repositories/storefront/`。
- 数据源切换
  当前后端支持 `memory` 和 `prisma` 两种仓库模式，可通过 `STOREFRONT_DATA_SOURCE` 切换；默认保持 `memory`，所以现有小程序联调链路不需要重测一大轮。
- Prisma 准备
  已补 `server/prisma/schema.prisma`、`server/prisma.config.ts`、首版 migration，以及 `prisma generate / prisma validate / prisma migrate deploy` 相关命令。
- 云托管准备
  已补 `server/Dockerfile` 和 `npm run start:cloud`，后面可以直接按微信云托管容器方式部署 `server/`。
- 当前范围
  Prisma 仓库已覆盖首页、商品、分类、购物车、地址、订单、优惠券、售后、个人中心、分销中心、团队、佣金、海报、模拟授权等前台用户态能力，并补了对应 migration；同时已补最小履约控制台和后台发货 / 售后审核接口。当前主要缺口已经从“仓库占位”转成“真实云上数据库、真实微信登录、真实支付和云上部署”。
- 登录态基础设施
  已补 mock 微信登录态骨架：后端新增 `/api/auth/session`、`/api/me`、`/api/auth/logout`，前端请求层已支持 `sessionToken` 注入和失效后的自动补会话。
- 真实微信登录预埋
  已补 `wx.login -> /api/auth/session -> code2Session` 这一层代码路径；当前默认仍保持 `sessionLoginMode="mock"`，等你补上 `WECHAT_APP_ID / WECHAT_APP_SECRET` 后再切成 `wechat`。
- 当前限制
  真实云上 `DATABASE_URL` 还没有，但本地 Docker MySQL + Prisma 真库联调路径已经补齐并可回归；当前还没开始的是云上数据库、真实微信登录正式联调、真实微信支付，以及更完整的运营后台。

## 前台补强进度表

| 优先级 | 模块 | 当前状态 | 已完成内容 | 下一步 |
| --- | --- | --- | --- | --- |
| P0 | 页面基础状态兜底 | 已完成 | 首页、分类、搜索、商品详情、购物车、结算、订单、订单详情、支付结果、售后、个人中心、地址、领券、分销、团队、佣金、海报、授权均已补 `loading / error / empty / notFound` 等状态 | 后续可抽公共状态样式或公共状态组件 |
| P0 | 主链路交互保护 | 已完成 | 加购、立即购买、结算提交、删除地址、删除购物车、取消订单、确认收货、领券、选券等都已补防重复点击与按钮状态，并已完成一轮手机真机主链路手测 | 后续新增功能时继续沿用这套交互保护模式 |
| P0 | 边界与错误提示 | 已完成 | 缺参数、无数据、接口失败、不可售后、重复售后、无地址、无券、无订单等都有页面内提示与回退入口 | 后续可统一错误文案风格 |
| P1 | 首页展示细节 | 已完成 | 首屏状态徽标、运营 banner、商品卖点标签、规格提示、推荐区信息层级已补齐 | 后续可继续补活动区、猜你喜欢、搜索推荐词 |
| P1 | 商品详情展示细节 | 已完成 | 商品指标、卖点标签、权益说明、图文详情说明、当前选择摘要已补齐 | 后续可补图集轮播、SKU 库存、详情富文本更完整渲染 |
| P1 | 订单与售后展示细节 | 已完成 | 订单列表已补售后入口与售后状态；订单详情已补进度、金额、服务说明；售后页已补订单上下文、金额、地址、处理流程 | 后续做整条订单链路回归和文案微调 |
| P1 | 个人中心与分销展示 | 已完成 | 个人中心入口状态已补齐，售后服务入口已接通；分销中心已补等级进度、动作卡片、新手引导 | 后续可继续补分销规则说明、邀请转化提示 |
| P2 | 体验联调与收口 | 基本完成 | 已完成全部前端页面 JS 语法检查、本地 API 冒烟、mock 主链路 smoke 检查、微信开发者工具内 `api` 主链路点击联调、手机真机预览回归，并统一了一轮高频状态页文案；请求层已补调试日志，地址编辑页输入框对齐问题已修复 | 后续在稳定基础库下补一轮快速复查，然后进入下一阶段真实业务能力建设 |
| P3 | 真实业务能力 | 推进中 | 已完成后端结构拆分、Prisma schema 与 migration、云托管容器文件、`memory|prisma` 数据源切换、mock 登录态基础设施、`wx.login + code2Session` 预埋链路，以及优惠券 / 售后 / 分销团队 / 佣金 / 海报等 Prisma 仓库实现；`memory` 模式仍保留用户侧过渡闭环，`prisma` 模式已补最小履约控制台、后台发货、售后审核，以及对应真库回归 | 下一步转向主体/备案、真实微信登录和云上部署 |

## 本轮联调结果

- 前端页面 JS 语法检查
  已对 `miniprogram/pages/*/index.js` 全量执行 `node -c`，当前全部通过。
- 本地 API 冒烟
  已确认 `GET /health`、`GET /api/home`、`GET /api/products`、`GET /api/cart`、`GET /api/checkout`、`GET /api/orders`、`GET /api/profile`、`GET /api/distribution` 返回 `200`。
- Prisma 准备校验
  已执行 `npm run prisma:validate` 和 `npm run prisma:generate`，当前均通过；`/health` 也会返回当前仓库模式，默认值为 `memory`。
- 本地 Docker MySQL + Prisma 真库回归
  已补 `server/compose.local-mysql.yml`、`npm run db:local:up`、`npm run prisma:seed:storefront`、`npm run storefront:regression:prisma`；真库回归覆盖 `user_sessions`、用户资料、购物车、优惠券、订单取消退券、后台发货、确认收货累积分销账单、售后提交与重复售后拦截、后台审核售后、团队/佣金/海报读取。
- 登录态链路冒烟
  已在默认 `memory` 模式下走通 `/api/auth/session -> /api/me -> /api/auth/authorize -> /api/profile -> /api/auth/logout`，退出后再次访问用户态接口会返回 `401`。
- 用户侧业务闭环冒烟
  已在 `memory` 模式下验证“选券下单 -> 取消订单退券”和“自动进入待收货 -> 确认收货 -> 分销账单累计”两条链路，当前前台在没有后台发货页的情况下也能继续往后跑。
- 最小履约入口冒烟
  已在 `prisma` 模式下验证后台管理员登录、订单读取、待发货单发货、售后单审核通过，以及审核结果回写。
- 微信登录预埋校验
  已验证 `sessionLoginMode="wechat"` 时，小程序端会先调用 `wx.login()`，再把 `{ loginType: "wechat_miniprogram", code }` 发给 `/api/auth/session`；服务端在缺少 `WECHAT_APP_ID / WECHAT_APP_SECRET` 时会返回清晰错误。
- mock 主链路 smoke 检查
  已在本地 service 层完成“首页数据 -> 商品详情 -> 加购 -> 结算 -> 下单 -> 订单详情”的一轮程序化检查，能够创建订单并拿到订单详情。
- 微信开发者工具 `api` 模式点击联调
  已手动走通“首页 -> 商品详情 -> 加购 -> 购物车 / 结算 -> 下单 -> 订单详情”主链路，请求日志显示 `/api/home`、`/api/profile`、`/api/categories`、`/api/products`、`/api/cart`、`/api/checkout`、`/api/orders/submit`、`/api/orders/:id` 均返回 `200`，当前未发现可复现的业务接口超时。
- 控制台孤立 `timeout` 提示说明
  微信开发者工具灰度基础库 `3.15.1` 下偶发出现一条孤立 `Error: timeout`，但同轮业务请求均成功且未出现 `[mall-request][fail]`，暂判断为开发者工具或基础库噪音，不作为当前前台主链路阻塞问题。
- 手机真机预览回归
  已在手机上完成一轮真机预览检查，主链路可正常走通，页面整体样式表现良好；过程中发现并修复了地址编辑页输入框占位文案未垂直居中的样式问题。当前前台版本可以视为“基础盘已打好”的可演示版本。回归清单见 `docs/frontend-regression-checklist.md`。

## 下一步建议

当前这版已经不只是“前台可演示”，而是已经把真实部署所需的后端骨架也垫好了。

如果按“最快上线”的关键路径理解，接下来建议按这个顺序推进：

1. 生产环境变量梳理
2. 主体注册与小程序备案
3. 真实微信登录
4. 腾讯云 MySQL + 微信云托管
5. 微信支付

详细清单见：

- `docs/remaining-tasks.md`

配套执行文档已补充：

- `docs/tech-stack.md`
- `docs/remaining-tasks.md`
- `docs/next-phase-roadmap.md`
- `docs/cloud-hosting-deployment.md`
- 这几份文档现在已经同步到“原生小程序 + Node/Express + Prisma/MySQL + 云托管方向，本地 Docker MySQL 与 Prisma 真库回归已可直接执行”的状态

## 本地 API 骨架

项目里已经补了一份本地 Node 服务骨架，目录是 `server/`。

当前前端默认已经切到本地 API。如果你想本地联调，可以按下面做：

1. 进入 `server/`
2. 执行 `npm install`
3. 执行 `npm run dev`
4. 在微信开发者工具里关闭“校验合法域名”
5. 保持 `miniprogram/config/env.js` 里的 `mallDataSource` 为 `"api"`

如果临时想退回纯 mock，只需要把 `miniprogram/config/env.js` 里的 `mallDataSource` 改回 `"mock"`。

当前本地后端还有两个要点：

- 默认仓库模式是 `memory`
  `GET /health` 会返回当前的 `storefrontRepositoryMode`，现在默认值是 `memory`。
- 本地真库路径现在已经补齐
  如果你要跑本地 Docker MySQL + Prisma，直接在 `server/` 下执行：
  `npm run db:local:up`
  `npm run prisma:migrate:deploy`
  `npm run prisma:seed:storefront`
  `npm run storefront:regression:prisma`
  然后再用：
  `STOREFRONT_DATA_SOURCE=prisma npm run dev`
- 最小履约控制台已经可用
  启动后端后，可直接打开：
  `http://127.0.0.1:3000/admin-console/`
  默认履约账号：
  `order / Order@123456`
  超级管理员账号：
  `admin / Admin@123456`
  需要注意：
  `memory` 模式仍保留“自动进入待收货”的演示闭环；`prisma` 模式已经切到后台发货驱动
- 微信登录默认仍走 mock
  当前 `miniprogram/config/env.js` 里的 `sessionLoginMode` 默认值是 `"mock"`；等你把服务端 `.env` 里的 `WECHAT_APP_ID / WECHAT_APP_SECRET` 配好后，再改成 `"wechat"`。

当前已经接好的本地接口包含：

- `GET /health`
- `GET /api/home`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/addresses`
- `GET /api/addresses/:id`
- `POST /api/addresses`
- `PUT /api/addresses/:id`
- `DELETE /api/addresses/:id`
- `POST /api/addresses/:id/select`
- `GET /api/cart`
- `PUT /api/cart`
- `POST /api/cart/items/add`
- `POST /api/cart/items/increase`
- `POST /api/cart/items/decrease`
- `POST /api/cart/items/remove`
- `GET /api/coupons`
- `POST /api/coupons/claim`
- `POST /api/coupons/select`
- `POST /api/coupons/clear`
- `GET /api/checkout`
- `POST /api/orders/submit`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/status`
- `POST /api/orders/:id/aftersale`
- `GET /api/profile`
- `POST /api/auth/session`
- `GET /api/me`
- `POST /api/auth/logout`
- `POST /api/auth/authorize`
- `GET /api/distribution`
- `GET /api/team`
- `GET /api/commissions`
- `GET /api/poster`

这套接口默认还是本地内存态，目的是保留一个稳定演示兜底；如果你要验证真实持久化链路，现在也可以切到本地 Docker MySQL + Prisma，再平移到微信云托管。
