const envConfig = require("./config/env");
const mallService = require("./services/mall-client");

function initializeCloud() {
  if (envConfig.requestTransport !== "cloud") {
    return;
  }

  if (!wx.cloud || typeof wx.cloud.init !== "function") {
    console.warn("[mall-cloud] 当前基础库不支持 wx.cloud.init");
    return;
  }

  const cloudEnvId = String(((envConfig.cloud || {}).env) || "").trim();

  if (!cloudEnvId) {
    console.warn("[mall-cloud] 已启用云托管请求，但 cloud.env 还没有填写");
    return;
  }

  wx.cloud.init({
    env: cloudEnvId,
    traceUser: true
  });
}

App({
  globalData: {},
  onLaunch(options) {
    initializeCloud();
    mallService.bootstrap(options || {});
  },
  onShow(options) {
    mallService.captureEntryContext(options || {});
  }
});
