const mallService = require("../../services/mall-client");

Page({
  data: {
    records: [],
    distributor: {},
    pageState: "loading",
    errorMessage: ""
  },
  async onShow() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: ""
      });

      this.setData({
        ...(await mallService.getCommissionData()),
        pageState: "success",
        errorMessage: ""
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "佣金明细加载失败"
      });
    }
  },
  retryLoad() {
    this.onShow();
  },
  backProfile() {
    wx.switchTab({
      url: "/pages/profile/index"
    });
  }
});
