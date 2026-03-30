# 项目状态快照

更新时间：2026-03-30

这份文档只回答 4 个问题：

- 这个项目现在做到哪里了
- 哪些事情已经完成，不要再回头重复做
- 现在真正还剩什么
- 下一步如果只做一件事，应该做什么

## 一句话结论

当前项目已经从“前台商城骨架 + 本地真库准备”推进到“本地真库 + 最小履约能力第一版已落地”。

现在不要再回头补本地 MySQL、Prisma 基础设施，也不要再继续扩本地履约功能面。

当前最值得继续推进的唯一方向是：

- 生产环境变量梳理
- 主体注册与小程序备案准备

## 当前目标

当前项目目标已经明确：

- 先做微信小程序单端上线
- 暂时不做跨端
- 官网不进关键路径
- 小程序正式上线前需要做“小程序备案”
- 暂时不做自定义公网域名 ICP 备案
- 生产后端方向是微信云托管
- 生产数据库方向是腾讯云 MySQL

## 当前里程碑

可以把当前阶段理解成：

- 前台基础盘已打稳
- 后端 storefront 分层已完成
- 本地 Docker MySQL + Prisma 真库回归已跑通
- 最小履约能力第一版已完成

也就是说，现在项目已经具备：

- 用户可以本地下单
- 订单可以进入真实数据库
- 后台可以查看订单
- 后台可以发货
- 后台可以处理售后

## 已完成，不要再重复做

下面这些现在都算“已完成”，不要再把它们当成当前主任务：

- 前端 19 个页面骨架
- `mock` / `api` 双模式
- 主链路“首页 -> 商品详情 -> 加购 -> 购物车 -> 结算 -> 下单 -> 订单 -> 订单详情”
- 微信开发者工具 `api` 联调
- 手机真机预览第一轮回归
- 后端 `router -> service -> repository` 结构
- Prisma 7 + MySQL schema / migration / Dockerfile / `start:cloud`
- `STOREFRONT_DATA_SOURCE=memory|prisma`
- 登录态第一批：`/api/auth/session`、`/api/me`、`/api/auth/logout`
- 小程序端本地 `sessionToken`、自动带 `Authorization`、`401` 自动补会话
- `wx.login + code2Session` 预埋
- 本地 Docker MySQL 编排
- Prisma 商品种子
- `STOREFRONT_DATA_SOURCE=prisma` 真库回归脚本
- 最小履约能力第一版：履约控制台、管理员登录、订单查看、发货、售后审核

## 当前最重要的行为边界

这条一定要记住，不然很容易按旧认知继续联调：

- `memory` 模式仍保留前台演示用的过渡闭环
- `memory` 模式下，新订单会自动进入待收货
- `prisma` 模式已经切到后台发货驱动
- `prisma` 模式下，订单会先停在待发货
- `prisma` 模式下，需要在履约控制台发货后，订单才会进入待收货

所以：

- 想演示前台主链路，用 `memory`
- 想验证真实持久化和履约流程，用 `prisma`

## 当前可用入口

### 前台联调

- 小程序目录：`miniprogram/`
- 当前本地服务目录：`server/`

### 最小履约控制台

- 入口：`http://127.0.0.1:3000/admin-console/`
- 履约账号：`order / Order@123456`
- 超级管理员账号：`admin / Admin@123456`

### 常用本地命令

在 `server/` 下执行：

- `npm run db:local:up`
- `npm run prisma:migrate:deploy`
- `npm run prisma:seed:storefront`
- `npm run storefront:regression:prisma`
- `STOREFRONT_DATA_SOURCE=prisma npm run dev`

## 当前已经实际验证通过的内容

已经实际跑过：

- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run prisma:migrate:deploy`
- `npm run storefront:regression:prisma`

已经实际验证通过的业务链包括：

- `user_sessions`
- 用户资料
- 购物车
- 优惠券领取、使用、取消订单退券
- 订单创建
- 后台发货
- 确认收货后累积分销账单
- 售后提交与重复提交拦截
- 后台审核售后并回写结果
- 团队 / 佣金 / 海报读取

## 当前还没做完的事情

当前真正剩下的，只有这些还在关键路径里：

- 生产环境变量梳理
- 小程序主体注册
- 小程序备案
- 真实微信登录联调
- 腾讯云 MySQL
- 微信云托管部署
- 微信支付
- 上线前联调与提审

## 当前不在关键路径里的事情

这些可以后置，不要现在分神：

- 官网
- H5 商城
- 跨端改造
- 自定义公网域名
- 自定义域名 ICP 备案
- 更完整的后台页面
- 更重的运营系统和 BI

## 下一步只做什么

如果接下来只允许做一件事，建议就是：

- 开始梳理生产环境变量，并同步准备主体注册与小程序备案资料

原因：

- 本地真库和最小履约已经够用了
- 现在真正可能拖慢上线节奏的，不再是本地开发
- 真正会卡住的是主体、备案、真实登录和云上配置

## 不要再做什么

为了防止继续发散，当前建议明确暂停这些动作：

- 不要再重复搭本地 MySQL 和 Prisma 基础设施
- 不要再继续扩“最小履约能力”的本地功能面
- 不要现在就开始做微信支付
- 不要把官网或跨端拉进当前主线

## 恢复上下文时先看哪三份

以后如果你一时想不起来做到哪里，先看这三份：

- 当前快照：`docs/project-status-snapshot.md`
- 剩余任务：`docs/remaining-tasks.md`
- 技术边界：`docs/tech-stack.md`
