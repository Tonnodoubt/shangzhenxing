# 微信商城小程序

一个以“微信小程序单端上线”为目标的原生商城项目。

当前方向已经明确：

- 先做微信小程序单端，不做跨端
- 官网不进关键路径
- 小程序正式上线前需要做“小程序备案”
- 暂时不做自定义公网域名 ICP 备案
- 生产后端方向是微信云托管
- 生产数据库方向是腾讯云 MySQL

## 项目概览

这个仓库包含两部分：

1. 小程序前台
   目录：`miniprogram/`
   作用：微信开发者工具导入、页面联调、真机预览

2. 后端服务
   目录：`server/`
   作用：提供商城接口、登录态、真实数据库接入、最小履约入口

当前已经不是单纯的页面骨架，而是具备了：

- 前台商城主链路
- `mock` / `api` 双模式
- Node/Express 后端
- Prisma + MySQL 真库路径
- 最小履约控制台

## 当前能力

### 前台页面

当前已包含：

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

### 后端能力

当前后端已经具备：

- `router -> service -> repository` 分层结构
- `memory | prisma` 双数据源切换
- `POST /api/auth/session`
- `GET /api/me`
- `POST /api/auth/logout`
- `wx.login + code2Session` 预埋链路
- 订单、优惠券、售后、分销团队、佣金、海报等用户态接口
- 本地 Docker MySQL + Prisma 真库回归
- 最小履约控制台 `/admin-console/`

### 最小履约能力

当前已经补到第一版，可用于本地真实履约联调：

- 管理员登录
- 订单列表
- 订单详情
- 后台发货
- 售后审核

默认账号：

- 履约账号：`order / Order@123456`
- 超级管理员：`admin / Admin@123456`

## 技术栈

- 前端：原生微信小程序
- 后端：Node.js + Express 4
- 数据层：Prisma 7 + MySQL
- 本地开发：Docker MySQL
- 生产部署：微信云托管 + 腾讯云 MySQL

更完整说明见：

- `docs/tech-stack.md`

## 仓库结构

```text
wechat-mini-shop/
├─ miniprogram/              # 原生微信小程序前端
├─ server/                   # Node/Express 后端
│  ├─ prisma/                # Prisma schema / migrations
│  ├─ scripts/               # 种子与真库回归脚本
│  ├─ public/admin-console/  # 最小履约控制台
│  └─ src/                   # 后端代码
└─ docs/                     # 项目说明与路线文档
```

## 快速开始

### 1. 导入小程序

1. 打开微信开发者工具
2. 选择“导入项目”
3. 项目目录选择当前仓库根目录
4. 当前 `AppID` 使用项目里的配置
5. 真正上线前替换成你自己的小程序 `AppID`

### 2. 启动本地后端

进入 `server/`：

```bash
npm install
npm run dev
```

默认是 `memory` 模式，适合前台快速联调和演示。

### 3. 切到本地 Prisma 真库

进入 `server/`：

```bash
npm run db:local:up
npm run prisma:migrate:deploy
npm run prisma:seed:storefront
npm run storefront:regression:prisma
STOREFRONT_DATA_SOURCE=prisma npm run dev
```

### 4. 打开最小履约控制台

启动后端后访问：

```text
http://127.0.0.1:3000/admin-console/
```

## `memory` 与 `prisma` 的区别

这条非常重要，避免按旧认知继续联调：

- `memory` 模式偏前台演示和快速联调
- `memory` 模式下，新订单会自动进入待收货
- `prisma` 模式偏真实持久化和履约流程联调
- `prisma` 模式下，订单会先停留在待发货
- `prisma` 模式下，需要在履约控制台发货后，订单才会进入待收货

所以：

- 想演示前台主链路，用 `memory`
- 想验证真实下单、履约、售后、真库回归，用 `prisma`

## 当前状态

如果你现在只想知道“项目做到哪里了”，优先看：

- `docs/project-status-snapshot.md`

如果你现在只想知道“当前还剩什么没做”，优先看：

- `docs/remaining-tasks.md`

当前可以把项目状态概括成：

- 前台基础盘已打稳
- 本地 Docker MySQL + Prisma 真库回归已跑通
- 最小履约能力第一版已完成
- 当前主线已经从“补本地基础设施”切到“主体 / 备案 / 真实登录 / 云上部署准备”

## 文档索引

- `docs/project-status-snapshot.md`
  适合快速恢复上下文

- `docs/remaining-tasks.md`
  适合看当前关键路径和剩余任务

- `docs/next-phase-roadmap.md`
  适合看下一阶段推进顺序

- `docs/cloud-hosting-deployment.md`
  适合看云托管部署边界和上线方式

- `docs/environment-variables.md`
  适合看服务端环境变量和小程序运行配置怎么收口

- `docs/frontend-regression-checklist.md`
  适合做前台回归时对照执行

## 当前关键路径

当前建议顺序是：

1. 生产环境变量梳理
2. 主体注册与小程序备案
3. 真实微信登录
4. 腾讯云 MySQL + 微信云托管
5. 微信支付

## 暂不进入关键路径的事项

这些可以后置：

- 官网
- H5 商城
- 跨端改造
- 自定义公网域名
- 自定义域名 ICP 备案
- 更完整的运营后台
- 更重的 BI 系统

## 说明

- 本仓库不提交本地 `.env`
- `project.private.config.json` 已忽略，不纳入版本管理
- 如果后续你要把这套项目公开演示，建议先替换掉真实业务文案、`AppID` 和任何生产配置
