# 分销能力收口实施方案（1/2/3/4）

更新时间：2026-04-13（晚）

这份文档对应“先文档后开发”策略，目标是把分销剩余能力按可执行里程碑推进。

## 0. 当前里程碑状态（按代码现状）

| 里程碑 | 当前状态 | 说明 |
| --- | --- | --- |
| M1 提现闭环 | 已完成 | 用户侧申请 + 后台审核/打款 + 状态机已落地 |
| M2 规则后台化 | 已完成并联动 | `ruleVersionId` 已写入订单/佣金快照链路 |
| M3 admin-console 分销工作区 | 已完成首版 | 规则版本页、分销员管理页、分销 KPI 已接入 |
| M4 二级分销 | 已完成核心闭环 | 已支持 L1/L2 归因快照、双层记佣、售后冲回 |

## 1. 现状基线（从当前代码出发）

当前已经具备：

- 一级邀请绑定与订单归因快照
- 订单确认收货后记佣（佣金流水可查询）
- 小程序分销中心、团队、佣金、海报页
- 提现申请/审核/打款闭环（M1）
- 规则版本化后端接口（M2）

当前明确缺口：

- 规则发布后的灰度能力（定时生效、灰度人群）未做
- L2 相关运营报表与对账视图未做

## 2. 总体推进顺序（维持不变）

1. M1 提现闭环（已完成）
2. M2 规则后台化（后端完成，进入联动阶段）
3. M3 admin-console 分销工作区（当前主攻）
4. M4 二级分销（最后做）

## 3. M1：提现流程闭环（已完成）

### 3.1 已落地范围

- 数据模型：`WithdrawalRequest` / `WithdrawalRequestItem` / `WithdrawalPayout`
- 状态机：`submitted -> approved/rejected -> paid/pay_failed`（含 `cancelled`）
- 用户侧：提现记录、提交申请、详情、撤销
- 后台侧：提现单列表、详情、审核、打款登记
- 账务字段：`withdrawableCommission / withdrawingCommission / withdrawnCommission`

### 3.2 已落地 API

用户侧：

- `GET /api/v1/withdrawals`
- `POST /api/v1/withdrawals`
- `GET /api/v1/withdrawals/:id`
- `POST /api/v1/withdrawals/:id/cancel`

后台侧：

- `GET /admin/v1/distribution/withdrawals`
- `GET /admin/v1/distribution/withdrawals/:id`
- `POST /admin/v1/distribution/withdrawals/:id/review`
- `POST /admin/v1/distribution/withdrawals/:id/payout`

### 3.3 后续优化（M1.5）

- 增强重复调用幂等键（跨渠道打款重放防护）
- 提现对账日报输出
- 渠道打款失败自动重试策略（当前为人工重试）

## 4. M2：规则引擎与运营后台化（后端已完成）

### 4.1 已落地范围

- 新增规则版本模型：`DistributionRuleVersion`
- 新增变更日志模型：`DistributionRuleChangeLog`
- 支持规则草稿创建、版本发布、日志追踪
- 保留旧 `PUT /distribution/rules` 兼容路径（直发发布）

### 4.2 已落地 API

- `GET /admin/v1/distribution/rules`（当前生效）
- `PUT /admin/v1/distribution/rules`（兼容旧接口）
- `GET /admin/v1/distribution/rule-versions`
- `POST /admin/v1/distribution/rule-versions`
- `POST /admin/v1/distribution/rule-versions/:ruleVersionId/publish`
- `GET /admin/v1/distribution/rule-change-logs`

### 4.3 收口情况（M2.5）

已完成：

- `Order.ruleVersionId`、`CommissionRecord.ruleVersionId` 快照字段与写入链路

待补：

- 规则发布后的运营灰度能力（定时生效、灰度人群）

## 5. M3：admin-console 分销工作区（首版完成）

### 5.1 当前完成度

已完成：

- 分销提现审核台（筛选、详情、审核、打款登记）
- 规则版本页（版本列表、创建草稿、发布、日志）
- 分销员管理页（列表、详情、状态变更）
- 分销总览 KPI 面板

待完成：

- 分页器与更细粒度筛选体验优化
- 分销运营动作的导出能力

### 5.2 验收标准

- 运营可在控制台独立完成“规则调整 -> 提现审核 -> 打款登记”
- 核心列表支持筛选与分页
- 关键动作均有操作日志可追踪

## 6. M4：二级分销（核心闭环已完成）

### 6.1 目标范围

- 订单快照增加 L1/L2 归因与佣金字段
- 佣金流水区分 L1/L2 级别
- 退款/售后支持双层比例冲回

### 6.2 当前完成

- 订单已写入 L2 邀请人、L2 比例、L2 佣金金额快照
- 确认收货后已按 L1/L2 生成佣金流水
- 售后审核通过时，已支持按 L1/L2 冲回佣金与余额，并处理幂等

### 6.3 待补

- L2 相关运营报表与对账视图

### 6.4 风险提示

- 规则复杂度和账务复杂度显著上升
- 在冲回闭环完成前，不建议扩大二级分销投放范围

## 7. 测试与对账要求（通用）

自动化测试要求：

- 仓储层单测：状态机、幂等、金额守恒
- API 回归：正常流 + 异常流 + 重复调用
- 回归验证：订单记佣、提现、打款、冲回

运营对账要求：

- 每日佣金变动日报（新增/冲回/提现/失败）
- 提现单状态日报（submitted/approved/pay_failed/paid）

## 8. 下一阶段执行建议

建议本周优先推进：

1. 补齐分销工作区分页、导出和筛选细节。
2. 评估规则灰度能力（定时生效、灰度人群）方案。
3. 设计 L2 运营报表与对账视图。

## 9. 本轮结论

当前已经跨过“能不能用”的阶段，进入“能不能稳定运营”的阶段。

主线建议保持：先收口后台与账务一致性，再上二级分销玩法。
