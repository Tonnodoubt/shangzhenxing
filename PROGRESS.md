# 项目进度表

最后更新时间：2026-04-02

这份进度表放在仓库根目录，方便直接看当前做到哪一步。

## 1. 总览

| 模块 | 当前状态 | 当前判断 |
| --- | --- | --- |
| 商城主链路 | 已完成 | 首页 -> 商品 -> 加购 -> 购物车 -> 结算 -> 下单 -> 订单 -> 订单详情 已可跑通 |
| 登录态 | 已完成第一批 | `/api/auth/session`、`/api/me`、`/api/auth/logout` 已接通，支持 mock / wechat_miniprogram |
| Prisma 真库 | 已完成第一轮 | MySQL、Prisma schema、migration、seed、回归脚本都已补齐 |
| 最小履约 | 已完成第一版 | 后台登录、订单查看、发货、售后审核已可走通 |
| 一级分佣真实归因 | 已完成第一版 | 已补 inviter 绑定、订单归因快照、确认收货后记佣给邀请人 |
| 裂变沉淀 | 部分做 | 海报分享路径已能带 inviter；商品卡真实分享、邀请奖励还没补完 |
| 拉新礼包 | 部分做 | 优惠券中心和券包基础有了；“邀请成功后发新人奖励”还没接完 |
| 提现流程 | 未做 | 还没有提现申请、审核、打款状态 |
| 积分体系 | 未做 | 账户、流水、签到、抵现、兑换都还没开始 |

## 2. 这轮刚完成

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| inviter 邀请绑定 | 已完成 | 首次建会话时可带 `inviterUserId` / `sourceScene`，只在首次满足条件时绑定 |
| 一级分佣归因 | 已完成 | 下单时会固化邀请人、来源和佣金快照，不再按“下单人自己拿佣金”算 |
| 订单完成后记佣 | 已完成 | 确认收货后佣金记到 inviter 的分销账户 |
| 团队直属成员沉淀 | 已完成第一版 | 团队数据优先读取真实邀请关系，能看到直属成员和人数 |
| 海报分享带参 | 已完成第一版 | 海报页已能生成带 inviter 的分享路径 |
| 自动化验证 | 已完成 | `npm run lint`、`npm test` 当前已跑通，`test:prisma` 仍可按需做真库回归 |

## 3. 还没做完

| 项目 | 当前状态 | 备注 |
| --- | --- | --- |
| 分佣提现 | 未做 | 缺申请单、审核、打款、提现状态 |
| 佣金正式结算 | 部分做 | 现在有 `pending / settled` 基础，`已提现` 还没补 |
| 商品卡真实分享 | 未做 | 目前先接了海报分享带参，商品详情分享还没补 |
| 邀请奖励闭环 | 未做 | 邀请成功后发券 / 礼包 / 奖励还没接 |
| 裂变统计 | 部分做 | 已有直属关系和基础团队数据，首单转化统计还可继续补细 |
| 积分系统 | 未做 | 仍是后续独立主线 |

## 4. 推荐下一步

建议继续按这个顺序往下做：

1. 先补 `提现申请 / 审核 / 打款状态`
2. 再补 `商品卡真实分享带 inviter`
3. 然后补 `邀请成功奖励 / 新人礼包闭环`
4. 最后再开 `积分系统`

## 5. 这份进度表对应的关键代码

- 分佣归因主逻辑：`server/src/repositories/storefront/prisma.js`
- 邀请绑定表和订单归因字段：`server/prisma/schema.prisma`
- 邀请归因迁移：`server/prisma/migrations/20260330190000_referral_attribution/migration.sql`
- 小程序入口参数透传：`miniprogram/app.js`
- 会话建链时透传 inviter：`miniprogram/services/mall-client.js`
- 海报分享入口：`miniprogram/pages/poster/index.js`

## 6. 代码治理进度

| 项目 | 当前状态 | 说明 |
| --- | --- | --- |
| 服务端 `lint` 护栏 | 已完成 | `server/` 已补 `npm run lint`，覆盖 `src/tests/scripts` |
| Prisma 仓库拆分第 1 刀 | 已完成 | 后台管理域已拆到 `server/src/repositories/storefront/prisma-admin.js` |
| Prisma 仓库拆分第 2 刀 | 已完成 | 分销域已拆到 `server/src/repositories/storefront/prisma-distribution.js` |
| Prisma 仓库拆分第 3 刀 | 已完成 | 优惠券域已拆到 `server/src/repositories/storefront/prisma-coupon.js` |
| Prisma 仓库拆分第 4 刀 | 已完成 | 订单 / 售后域已拆到 `server/src/repositories/storefront/prisma-order.js` |
| Prisma 仓库拆分第 5 刀 | 已完成 | 商品浏览域已拆到 `server/src/repositories/storefront/prisma-catalog.js` |
| Prisma 仓库拆分第 6 刀 | 已完成 | 购物车 / 地址域已拆到 `server/src/repositories/storefront/prisma-cart.js` |
| Prisma 仓库拆分第 7 刀 | 已完成 | 登录态 / 邀请绑定域已拆到 `server/src/repositories/storefront/prisma-session.js` |
| Prisma 仓库拆分第 8 刀 | 已完成 | 个人中心域已拆到 `server/src/repositories/storefront/prisma-profile.js` |
| Prisma 仓库拆分第 9 刀 | 已完成 | mapper / formatter / 订单状态辅助已拆到 `server/src/repositories/storefront/prisma-mappers.js` |
| 双实现契约回归第 1 批 | 已完成 | 已补 `memory / prisma` 在 `session / catalog / address / cart` 上的契约式回归测试 |
| 双实现契约回归第 2 批 | 已完成 | 已补 `coupon / checkout / order / aftersale / profile / distribution` 契约回归，并修正售后返回里的公开 `orderId` 语义 |
| 默认自动化回归 | 已增强 | `npm test` 现在同时覆盖 memory API、`prisma-admin`、`prisma-distribution`、`prisma-coupon`、`prisma-order`、`prisma-catalog`、`prisma-cart`、`prisma-session`、`prisma-profile`、`prisma-mappers`、`storefront-contract`、`session-login` 测试 |
| Prisma 主文件体量 | 已大幅收敛 | `server/src/repositories/storefront/prisma.js` 已从约 `3753` 行降到 `288` 行 |
| Admin Console 资源拆分 | 已完成 | `server/public/admin-console/index.html` 已拆成 `index.html`、`admin-console.css`、`admin-console.js` 三个职责文件 |
| 下一刀 | 待做 | 优先收口 `server/src/shared/mall.js` 和 `miniprogram/services/mall.js` 的双份逻辑，或继续细拆 `admin-console.js` |
