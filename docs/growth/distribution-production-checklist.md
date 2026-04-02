# 分销 / 分佣现状与上线路线

更新时间：2026-03-31

这份文档把原来的“结构图”和“上线路线图”合并成了一篇，目的只有一个：

- 说清楚当前代码里已经有什么，离可运营版还差什么

## 一句话结论

当前项目已经做完“一级分佣第一版基础链路”，但还没有到正式可长期运营版。

已经落到代码里的部分有：

- 分销中心、团队、佣金、海报页
- inviter 首次绑定
- 下单归因快照
- 确认收货后给 inviter 记佣

还没补完的关键部分有：

- 退款 / 售后冲回
- 结算状态和人工结算
- 提现申请和审核
- 后台规则配置和调账

## 当前代码里已经有的能力

### 页面与接口

用户侧已经有：

- `pages/distribution/index`
- `pages/team/index`
- `pages/commissions/index`
- `pages/poster/index`

前端已经接上：

- `GET /api/distribution`
- `GET /api/team`
- `GET /api/commissions`
- `GET /api/poster`

### 数据落点

Prisma 当前已经有这些核心字段或模型：

- `DistributorProfile`
- `CommissionRecord`
- `ReferralBinding`
- `Order.referralBindingId`
- `Order.inviterUserId`
- `Order.sourceScene`
- `Order.commissionBaseAmount`
- `Order.commissionRate`
- `Order.commissionAmount`

### 当前真实归因链路

现在第一版的链路已经是：

1. 用户通过分享路径进入
2. 会话建立时尝试绑定 `inviterUserId`
3. 下单时把 inviter、来源和佣金快照固化到订单
4. 订单确认收货后，把佣金记到 inviter 的分销账户

这意味着当前项目已经不是“纯展示分销”，而是有了真实归因雏形。

## 当前还没做完的地方

### 1. 结算链路不完整

当前有 `pending / settled` 基础，但还缺：

- 提现申请
- 提现审核
- 打款状态
- 结算批次

### 2. 退款冲回还没闭环

现在最值得补的是：

- 全额退款如何冲回佣金
- 部分退款如何按比例冲回
- 售后完成后佣金状态如何变化

### 3. 后台运营能力还不够

目前缺少：

- 分销规则后台
- 分销员管理
- 调账能力
- 审计日志

### 4. 分享侧还不够完整

当前已经有海报分享带参，但还可以继续补：

- 商品卡真实分享
- 邀请记录页
- 更完整的直属成员和成交统计

## 首发最推荐的规则冻结

如果目标是尽快补成可用版，建议先把规则收成下面这一版：

1. 只做一级直推，不做二级。
2. 邀请关系只认首次有效绑定，不反复改上级。
3. 佣金在确认收货后生成。
4. 佣金基数按参与分销商品的实付小计算。
5. 退款和售后先做“冲回佣金”，再考虑复杂调账。
6. 结算先做人工作业，不要先做自动打款。

这样做的好处是：

- 用户容易理解
- 财务容易核对
- 技术复杂度也明显更低

## 最值得继续补的顺序

如果按性价比排序，建议这样推进：

1. 先补退款 / 售后冲回佣金
2. 再补结算状态和人工结算后台
3. 再补提现申请 / 审核
4. 最后再考虑商品卡分享、排行榜、等级体系

## 当前明确不建议先做的东西

当前不建议先拉进主线的内容：

- 二级分佣
- 自动打款
- 复杂等级晋升
- 排行榜
- 大团队树
- 很重的风控规则引擎

原因不是这些没价值，而是：

- 它们都不是第一版真正阻塞上线的部分
- 先把一级分佣做扎实，比一口气加很多玩法更值钱

## 相关代码

- 小程序入口参数透传：[app.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/app.js)
- 会话建链透传 inviter：[mall-client.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/services/mall-client.js)
- 海报分享路径：[poster/index.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/pages/poster/index.js)
- 数据模型：[schema.prisma](/Users/tongqianqiu/store/wechat-mini-shop/server/prisma/schema.prisma)
- 分销主逻辑：[prisma.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma.js)

## 结论

一句话收口：

- 当前已经不是“纯展示分销”
- 但还不是“正式可运营分销系统”

接下来最合理的动作，不是继续加花样，而是把：

- 退款冲回
- 结算状态
- 后台运营入口

这三件事补扎实。
