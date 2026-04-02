module.exports = {
  // 走后端接口数据。
  mallDataSource: "api",
  // `mock` 表示继续走模拟会话；切成 `wechat` 后会改为 `wx.login -> /api/auth/session`。
  sessionLoginMode: "mock",
  // 云托管联调使用 wx.cloud.callContainer。
  requestTransport: "cloud",
  apiBaseUrl: "http://127.0.0.1:3000",
  requestTimeout: 8000,
  // 本地联调时打印请求开始、成功、失败日志，方便定位 timeout 和接口异常。
  enableRequestDebug: true,
  cloud: {
    env: "shangzhenxing-7guu17m1a644fd92",
    // 必须和云托管控制台里的“服务名称”完全一致。
    service: "mini-shop-api04",
    path: "/api"
  }
};
