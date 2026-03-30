module.exports = {
  // 稳定预览版默认走 mock；需要联调本地接口时改成 "api"。
  mallDataSource: "mock",
  // `mock` 表示继续走模拟会话；切成 `wechat` 后会改为 `wx.login -> /api/auth/session`。
  sessionLoginMode: "mock",
  // 未来可切换成 "cloud"，走 wx.cloud.callContainer。
  requestTransport: "http",
  apiBaseUrl: "http://127.0.0.1:3000",
  requestTimeout: 8000,
  // 本地联调时打印请求开始、成功、失败日志，方便定位 timeout 和接口异常。
  enableRequestDebug: true,
  cloud: {
    env: "",
    // 预留字段，当前请求层还没有读取 service。
    service: "",
    path: "/api"
  }
};
