const mallService = require("./services/mall-client");

App({
  globalData: {},
  onLaunch() {
    mallService.bootstrap();
  }
});
