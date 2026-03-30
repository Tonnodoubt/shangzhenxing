const mallService = require("../../services/mall-client");

Page({
  data: {
    agreed: true,
    user: {},
    pageState: "loading",
    errorMessage: "",
    authorizing: false,
    sessionLoginModeTag: "",
    sessionLoginModeTitle: "",
    sessionLoginModeCopy: ""
  },
  onLoad() {
    const sessionLoginModeSummary = mallService.getSessionLoginModeSummary();

    this.setData({
      sessionLoginModeTag: sessionLoginModeSummary.tag,
      sessionLoginModeTitle: sessionLoginModeSummary.title,
      sessionLoginModeCopy: sessionLoginModeSummary.copy
    });
  },
  async onShow() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: ""
      });

      this.setData({
        user: await mallService.getUser(),
        pageState: "success",
        errorMessage: ""
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "授权页加载失败"
      });
    }
  },
  toggleAgreement() {
    if (this.data.authorizing || this.data.pageState !== "success") {
      return;
    }

    this.setData({
      agreed: !this.data.agreed
    });
  },
  async authorize() {
    if (this.data.pageState !== "success" || this.data.authorizing) {
      return;
    }

    if (!this.data.agreed) {
      wx.showToast({
        title: "请先勾选协议",
        icon: "none"
      });
      return;
    }

    let user = null;

    try {
      this.setData({
        authorizing: true
      });

      user = await mallService.authorizeUser();
    } catch (error) {
      this.setData({
        authorizing: false
      });
      wx.showToast({
        title: error.message || "授权失败",
        icon: "none"
      });
      return;
    }

    this.setData({
      user,
      authorizing: false
    });

    wx.showToast({
      title: "授权成功",
      icon: "success"
    });

    setTimeout(() => {
      wx.navigateBack({
        delta: 1
      });
    }, 250);
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
