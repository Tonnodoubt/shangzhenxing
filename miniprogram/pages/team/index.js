const mallService = require("../../services/mall-client");

Page({
  data: {
    teamMembers: [],
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
        ...(await mallService.getTeamData()),
        pageState: "success",
        errorMessage: ""
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "团队数据加载失败"
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
