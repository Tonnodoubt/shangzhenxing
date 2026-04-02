const mallService = require("../../services/mall-client");

Page({
  data: {
    user: {},
    distributor: {},
    coupon: null,
    sharePath: "/pages/home/index",
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
        ...(await mallService.getPosterData()),
        pageState: "success",
        errorMessage: ""
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "海报页加载失败"
      });
    }
  },
  savePoster() {
    wx.showToast({
      title: "保存能力待接真机相册",
      icon: "none"
    });
  },
  sharePoster() {
    return null;
  },
  onShareAppMessage() {
    const nickname = String((this.data.user || {}).nickname || "").trim() || "好友";

    return {
      title: `${nickname}邀请你来逛商城`,
      path: this.data.sharePath || "/pages/home/index"
    };
  },
  retryLoad() {
    this.onShow();
  },
  backDistribution() {
    wx.redirectTo({
      url: "/pages/distribution/index"
    });
  }
});
