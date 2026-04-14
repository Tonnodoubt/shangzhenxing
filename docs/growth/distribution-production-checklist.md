# 分销 / 分佣现状与上线路线

更新时间：2026-04-13

这份文档用于回答两个问题：

- 现在分销系统已经做到什么程度
- 离“可长期运营”的版本还差哪些关键能力

如果要看按里程碑的实施方案，请配合阅读：

- [distribution-delivery-plan.md](/Users/tongqianqiu/shangzhenxing/wechat-mini-shop/docs/growth/distribution-delivery-plan.md)

## 一句话结论

当前分销系统已经从“展示型”升级为“可操作型”：

- 一级分销归因链路已落地
- 提现闭环（申请/审核/打款）已落地
- 规则版本化后端能力已落地

但还不是最终运营版，核心缺口仍在：

- 退款/售后冲回佣金未闭环
- 规则版本尚未与订单/佣金快照强绑定
- admin-console 分销工作区只完成了提现台，规则和分销员 UI 仍待补齐
- 二级分销（M4）尚未开始

## 里程碑状态

- `M1 提现闭环`：已完成（后端 + 提现审核台）
- `M2 规则后台化`：后端已完成（版本/发布/日志接口可用）
- `M3 admin-console 分销工作区`：进行中（已完成提现审核台，规则/分销员管理未完成）
- `M4 二级分销`：未开始

## 当前已落地能力

### 1. 用户侧（小程序）

页面已接入：

- `pages/distribution/index`
- `pages/team/index`
- `pages/commissions/index`
- `pages/poster/index`

接口已可用：

- `GET /api/v1/distribution`
- `GET /api/v1/team`
- `GET /api/v1/commissions`
- `GET /api/v1/poster`
- `GET /api/v1/withdrawals`
- `POST /api/v1/withdrawals`
- `GET /api/v1/withdrawals/:id`
- `POST /api/v1/withdrawals/:id/cancel`

### 2. 后台侧（运营）

提现运营接口已可用：

- `GET /admin/v1/distribution/withdrawals`
- `GET /admin/v1/distribution/withdrawals/:withdrawalId`
- `POST /admin/v1/distribution/withdrawals/:withdrawalId/review`
- `POST /admin/v1/distribution/withdrawals/:withdrawalId/payout`

规则版本化接口已可用：

- `GET /admin/v1/distribution/rules`
- `PUT /admin/v1/distribution/rules`（兼容旧接口，直接发布）
- `GET /admin/v1/distribution/rule-versions`
- `POST /admin/v1/distribution/rule-versions`
- `POST /admin/v1/distribution/rule-versions/:ruleVersionId/publish`
- `GET /admin/v1/distribution/rule-change-logs`

分销员接口已可用：

- `GET /admin/v1/distributors`
- `GET /admin/v1/distributors/:distributorId`
- `POST /admin/v1/distributors/:distributorId/status`

### 3. 数据模型（Prisma）

已包含：

- `ReferralBinding`
- `DistributorProfile`
- `CommissionRecord`
- `WithdrawalRequest`
- `WithdrawalRequestItem`
- `WithdrawalPayout`
- `DistributionRuleVersion`
- `DistributionRuleChangeLog`

并已扩展状态字段：

- `CommissionStatus = pending|settled|withdrawing|withdrawn|reversed`
- `WithdrawalStatus = submitted|approved|rejected|paying|paid|pay_failed|cancelled`

## 当前主要缺口（按优先级）

### P0：退款 / 售后冲回佣金

现状：

- 订单完成记佣已实现
- `reversed` 状态已预留
- 但“退款/售后完成 -> 按比例冲回佣金”尚未形成完整业务闭环

风险：

- 账务会偏乐观，影响财务对账与提现风控

### P0：规则版本与订单快照绑定

现状：

- 规则版本可创建/发布/留痕
- 但订单与佣金还未记录 `ruleVersionId` 快照

风险：

- 后续追溯“某笔佣金按哪个规则算出”会不够硬

### P1：admin-console 分销工作区补完

现状：

- 提现审核台已有可操作 UI
- 规则版本列表/发布、分销员管理等可视化页仍缺

风险：

- 运营仍需依赖接口层，无法完全在控制台独立闭环

### P2：二级分销（M4）

现状：

- 方案已定，代码未开工

## 推荐下一步（短期）

1. 先补“售后冲回佣金”闭环（含幂等、对账字段、自动化测试）。
2. 再补“规则版本 -> 订单/佣金快照”绑定字段与写入逻辑。
3. 完成 admin-console 的规则版本页和分销员管理页，形成完整运营工作区。

## 相关代码参考

- 分销后端主模块：[prisma-distribution.js](/Users/tongqianqiu/shangzhenxing/wechat-mini-shop/server/src/repositories/storefront/prisma-distribution.js)
- 分销管理路由：[router.js](/Users/tongqianqiu/shangzhenxing/wechat-mini-shop/server/src/admin/router.js)
- 分销数据模型：[schema.prisma](/Users/tongqianqiu/shangzhenxing/wechat-mini-shop/server/prisma/schema.prisma)
- admin-console（含提现审核台）：[admin-console.js](/Users/tongqianqiu/shangzhenxing/wechat-mini-shop/server/public/admin-console/admin-console.js)

## 结论

分销系统已从“只能看”进入“可运营早期版”。

下一步关键不是继续加玩法，而是把：

- 冲回对账
- 规则快照
- 运营控制台收口

这三件事补稳，才能进入长期可运营状态。
