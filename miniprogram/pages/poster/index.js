const mallService = require("../../services/mall-client");

Page({
  data: {
    user: {},
    distributor: {},
    coupon: null,
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
    wx.showToast({
      title: "分享能力待接微信转发",
      icon: "none"
    });
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
