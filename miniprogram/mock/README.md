# Mock Module (MiniProgram)

这个目录是小程序侧 mock 能力的统一入口。

- `getMockMallService()`：返回 mock 商城业务服务（原 `shared/mall-core`）
- `getMockFixtures()`：返回 mock 静态数据（原 `shared/mock`）

后续新增或调整 mock，优先改这里，避免 `services/` 里散落直接引用。
