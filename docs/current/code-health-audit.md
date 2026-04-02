# 代码健康度体检报告

更新时间：2026-04-02

这份文档只回答一件事：

- 当前这套代码到底是不是“屎山”
- 如果不是，它现在离“开始失控”还有多远
- 接下来最值得优先治理的技术债是什么

## 一句话结论

当前项目还不是“屎山”。

更准确的判断是：

- 架构骨架是对的
- 核心链路已经成型
- 自动化验证不是空白
- `Prisma` 超大单文件已经完成拆分
- 后台控制台已经拆出独立静态资源
- 当前主要剩余风险集中在共享 `mall` 的 `admin` 域继续细拆、后台脚本继续模块化，以及 `memory / prisma` 行为继续防漂移

如果继续直接堆功能、不做拆分，后面很容易往“难维护的大文件项目”演变。

当前维护性主观评分：

- `7 / 10`

当前阶段判断：

- 属于“可上线、可继续做，但要开始控制技术债”
- 还不到“推倒重来”的程度
- 也不适合继续长期无节制加功能

## 这次体检看了什么

这次判断主要基于下面几类证据：

- 文件体量
- 模块边界
- 重复逻辑
- 测试存在性
- 部署和运行链路
- 当前工具链约束

本地已验证：

- `npm run lint` 通过
- `npm test` 通过，结果是 `49 / 49`

## 最新治理进展

- [prisma.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma.js#L1) 已从约 `3793` 行收敛到 `288` 行，并把会话、商品、购物车、优惠券、订单、分销、个人中心、后台管理和 mapper/helper 拆到独立文件。
- [index.html](/Users/tongqianqiu/store/wechat-mini-shop/server/public/admin-console/index.html#L1) 已完成 `HTML / CSS / JS` 拆分，当前分别为 `343 / 689 / 1430` 行。
- `mall / mock` 双份逻辑已收口为单源，核心现在集中在 [mall-core.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall-core.js#L1) 和 [mock.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mock.js#L1)，前后端原入口均已改成 `1` 行薄封装。
- 共享 `mall` 单源已完成第二轮拆分：[mall-core.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall-core.js#L1) 已从约 `2517` 行收敛到 `1076` 行，并把前台与后台 API 分别拆到 [storefront-api.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/storefront-api.js#L1) 和 [admin-api.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/admin-api.js#L1)。
- 共享 `mall` 单源已完成第三轮拆分：[mall-core.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall-core.js#L1) 已进一步收敛到 `378` 行，`seed / runtime state / lifecycle helper` 已分别拆到 [runtime-store.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/runtime-store.js#L1) 和 [runtime-helpers.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/runtime-helpers.js#L1)。
- `memory / prisma` 已补契约式回归，默认测试已覆盖 `session / catalog / address / cart / coupon / checkout / order / aftersale / profile / distribution`。

## 总体评价

### 当前做得好的地方

1. 分层结构是清楚的

- 后端不是直接把接口、业务和数据读写揉成一个文件。
- `router -> service -> repository` 这条主线已经形成。
- 参考：
  [admin/router.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/admin/router.js#L1)
  [service.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/modules/admin/service.js#L1)
  [storefront/router.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/modules/storefront/router.js#L1)

2. 已经有测试兜底，不是裸奔

- 服务端测试文件已经有一定体量，不是只有一两个样例。
- 当前至少覆盖了会话、下单、优惠券、售后、履约、权限、商品管理。
- 参考：
  [api.test.js](/Users/tongqianqiu/store/wechat-mini-shop/server/tests/api.test.js#L1)
  [prisma.test.js](/Users/tongqianqiu/store/wechat-mini-shop/server/tests/prisma.test.js#L1)
  [package.json](/Users/tongqianqiu/store/wechat-mini-shop/server/package.json#L6)

3. 云上运行路径已经打通

- 有单独的云启动脚本、迁移逻辑、健康检查接口。
- 这说明项目不是只停留在本地演示阶段。
- 参考：
  [start-cloud.js](/Users/tongqianqiu/store/wechat-mini-shop/server/scripts/start-cloud.js#L1)
  [index.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/index.js#L1)

4. 文档状态比一般小项目好

- 当前项目不是“只能靠作者脑内记忆维护”。
- 至少项目状态、环境变量、部署边界都有落文档。
- 参考：
  [project-status-snapshot.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/current/project-status-snapshot.md)
  [environment-variables.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/setup/environment-variables.md)
  [cloud-hosting-deployment.md](/Users/tongqianqiu/store/wechat-mini-shop/docs/setup/cloud-hosting-deployment.md)

## 主要风险点

下面这些不是“项目已经烂了”，而是“再不控制就会变难维护”的地方。

### 已完成治理 1：Prisma 仓库超大单文件已拆分

原来的最大技术债热点是：

- [prisma.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma.js#L1)

现状：

- 主入口现在约 `288` 行，基本只保留仓库装配职责
- 已按领域拆到：
  - [prisma-session.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma-session.js#L1)
  - [prisma-catalog.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma-catalog.js#L1)
  - [prisma-cart.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma-cart.js#L1)
  - [prisma-coupon.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma-coupon.js#L1)
  - [prisma-order.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma-order.js#L1)
  - [prisma-distribution.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma-distribution.js#L1)
  - [prisma-profile.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma-profile.js#L1)
  - [prisma-admin.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma-admin.js#L1)
  - [prisma-mappers.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma-mappers.js#L1)
- 针对拆分后的模块已经补了对应单测和跨实现契约回归

判断：

- 这个最高优先级结构风险已经完成第一轮治理
- 后续只需要继续避免把新业务重新堆回主入口

### 已完成治理 2：`mall / mock` 双份逻辑已收口为单份核心

原来的热点是：

- [server/src/shared/mall.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/shared/mall.js#L1)
- [miniprogram/services/mall.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/services/mall.js#L1)
- [server/src/shared/mock.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/shared/mock.js#L1)
- [miniprogram/data/mock.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/data/mock.js#L1)

现状：

- 真实实现已经收口到：
  - [mall-core.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall-core.js#L1)
  - [mock.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mock.js#L1)
- 前后端原入口现在都是 `1` 行包装层，只负责转发到共享核心
- “双份漂移”风险已经消掉，新增 mock 业务只需要维护单源
- 第二轮拆分后，前台和后台 API 已独立到：
  - [storefront-api.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/storefront-api.js#L1)
  - [admin-api.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/admin-api.js#L1)
- 第三轮拆分后，共享层已经进一步稳定成：
  - [mall-core.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall-core.js#L1) 约 `378` 行，主要只负责公共 helper 与装配
  - [runtime-store.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/runtime-store.js#L1) 约 `490` 行，负责 seed、initial state、`getState / withState / bootstrap`
  - [runtime-helpers.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/runtime-helpers.js#L1) 约 `308` 行，负责订单生命周期、优惠券和页面数据拼装
- 当前最明显的新热点已经收敛到 [admin-api.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/admin-api.js#L1) 约 `968` 行，后续适合继续按 `category / product / sku / order / aftersale / coupon / distribution` 细拆

判断：

- 这项长期维护风险已经完成第一轮治理
- 下一阶段更值得关注的是“共享单源继续模块化”，而不是“双份同步”

### 已完成治理 3：商家后台已拆出独立 CSS / JS 资源

当前后台页面集中在：

- [index.html](/Users/tongqianqiu/store/wechat-mini-shop/server/public/admin-console/index.html#L1)
- [admin-console.css](/Users/tongqianqiu/store/wechat-mini-shop/server/public/admin-console/admin-console.css#L1)
- [admin-console.js](/Users/tongqianqiu/store/wechat-mini-shop/server/public/admin-console/admin-console.js#L1)

现状：

- `index.html` 现在约 `343` 行，只保留结构骨架
- `admin-console.css` 约 `689` 行，样式已独立
- `admin-console.js` 约 `1430` 行，交互逻辑已独立
- 原来“HTML / CSS / JS 全塞在一个文件里”的结构风险已经解除

判断：

- 单 HTML 文件热点已经处理掉
- 如果后台继续横向扩功能，下一步应该按 `summary / category / product / sku / order / aftersale` 继续拆 `admin-console.js`

### 中低优先级风险 4：`memory / prisma` 双实现已加回归，但仍需防漂移

当前仓库模式切换集中在：

- [storefront/index.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/index.js#L1)
- [memory.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/memory.js#L1)
- [prisma.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/repositories/storefront/prisma.js#L1)

这套设计本身没有错，前期反而很实用：

- `memory` 适合演示
- `prisma` 适合真库联调

但风险是：

- 新功能补到一半，容易只补 Prisma，不补 memory
- 或只在 memory 里有过渡行为，Prisma 没对齐
- 时间久了以后，两个模式的行为会越来越不一致

当前已经补上的护栏：

- [storefront-contract.test.js](/Users/tongqianqiu/store/wechat-mini-shop/server/tests/storefront-contract.test.js#L1) 已覆盖关键接口的结构和状态约束
- 契约回归已经实打实打出过一个真实漂移问题，并修正了 `aftersale.orderId` 的公开语义

判断：

- 当前属于“设计合理，且已有基础护栏”
- 但新功能继续增加时，仍然需要纪律维护

### 中低优先级风险 5：工具链护栏已补上 lint，但还能继续加强

从 [package.json](/Users/tongqianqiu/store/wechat-mini-shop/server/package.json#L6) 看，当前有：

- `lint`
- `test`
- `test:api`
- `test:prisma`

但没有明显看到：

- `format`
- `typecheck`

这带来的问题不是马上炸，而是：

- 一些无用引用、重复代码、风格漂移更难被自动发现
- 大文件继续膨胀时，没有工具及时提醒

判断：

- `lint` 这条最小护栏已经补上
- `format / typecheck` 仍然值得作为后续增强，但已经不是当前最急的问题

## 当前不算大问题的地方

下面这些目前不应被过度夸大：

1. 目前仍在用 CommonJS 和纯 JavaScript

- 这不等于代码差
- 真正的问题是边界和体量，不是模块语法

2. 后端路由文件偏长

- [admin/router.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/admin/router.js#L1) 约 `479` 行
- 还没有到需要立刻拆碎的程度
- 当前它的职责仍然相对单一

3. 当前没有前后端完全分离的后台工程

- 这属于 MVP 的合理取舍
- 真正要警惕的是后台页面继续在单文件里横向扩张

## 结论：到底是不是“屎山”

我的结论是：

- 不是屎山
- 但已经开始出现“热点山头”

更准确的说法是：

- 主结构可维护
- 业务闭环成型
- 测试与文档已有基础
- 关键大文件已经开始被拆
- 但共享 mall 的 admin 热点模块和个别前端脚本热点仍要继续控制

如果现在停下来做一轮整理，这个项目完全能保持在“可长期维护”的区间。

如果继续连续加支付、会员、积分、更多后台能力，而完全不拆文件，那么它确实会往“屎山化”走。

## 建议的治理顺序

### 第一优先级：继续拆共享 `mall` 的 admin 热点模块

当前最值得继续治理的是：

- [admin-api.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/admin-api.js#L1)

建议方向：

1. 把 [admin-api.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/shared/mall/admin-api.js#L1) 按 `category / product / sku / order / aftersale / coupon / distribution` 继续细拆
2. 保留 [server/src/shared/mall.js](/Users/tongqianqiu/store/wechat-mini-shop/server/src/shared/mall.js#L1) 和 [miniprogram/services/mall.js](/Users/tongqianqiu/store/wechat-mini-shop/miniprogram/services/mall.js#L1) 这类稳定入口，不让调用方感知内部迁移
3. 每拆一块就补对应回归，避免单源重构把 mock 行为改坏

### 第二优先级：继续拆后台控制台脚本

这一步不需要立刻做，但如果后台继续扩功能，建议优先拆：

- [admin-console.js](/Users/tongqianqiu/store/wechat-mini-shop/server/public/admin-console/admin-console.js#L1)

建议按工作区拆成：

- `summary`
- `category`
- `product`
- `sku`
- `order`
- `aftersale`

### 第三优先级：继续补跨模式契约回归边界

当前关键主链路已经有契约回归，后面更值得补的是：

1. 异常码和错误提示
2. 空态和边界输入
3. 后台商品管理的极端路径
4. 权限差异场景

目标是让 `memory` 和 `prisma` 在“正常路径一致”之外，连“失败路径”也尽量一致。

### 第四优先级：按需补更强工程护栏

当前不一定需要立刻上重工具链，但后面可以按需补：

1. `format`
2. `typecheck` 或渐进式类型标注
3. 大文件阈值和目录约束的轻量规则

## 当前建议你怎么理解这个项目

如果你不是逐行读代码的人，那最稳的心智模型应该是：

- 这是一个“骨架已经搭对”的项目
- 不是乱七八糟拼出来的演示页
- 但它已经到了“需要开始管理技术债”的节点

所以你现在不需要担心“整套东西都不可靠”。

你真正要担心的是：

- 再继续猛加功能而不拆热点文件

一句话收尾：

- 现在能用，也能继续做
- 但下一阶段最好从“只追功能”切到“功能 + 结构一起管理”
