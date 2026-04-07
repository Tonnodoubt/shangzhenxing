module.exports = {
  // 走后端接口数据。
  mallDataSource: "api",
  // `wechat` 走 wx.login -> /api/auth/session；开发调试时可临时改为 `mock`。
  sessionLoginMode: "wechat",
  // 云托管联调使用 wx.cloud.callContainer。
  requestTransport: "cloud",
  apiBaseUrl: "http://127.0.0.1:3000",
  requestTimeout: 8000,
  // 生产环境务必关闭；本地联调时可临时改为 true。
  enableRequestDebug: false,
  cloud: {
    env: "shangzhenxing-9gcnl5k01ed8de51",
    // 必须和云托管控制台里的"服务名称"完全一致。
    service: "shangzhenxing",
    path: "/api"
  }
};
