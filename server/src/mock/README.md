# Mock Module (Server)

这个目录是服务端 mock 能力的统一入口。

- `createMockStorefrontSource()`：memory 仓库使用的 mock 业务源
- `getMockCatalogFixtures()`：Prisma seed 使用的 mock 分类与商品
- `getMockQuickEntries()`：首页快捷入口 mock 数据

后续如果要调整 mock 结构，优先改这里，避免在仓库层到处直接 `require shared/mock`。
