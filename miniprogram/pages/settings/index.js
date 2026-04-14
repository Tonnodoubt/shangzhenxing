const mallService = require("../../services/mall-client");

function maskPhone(phone) {
  const raw = String(phone || "").trim();

  if (!raw) {
    return "未绑定手机号";
  }

  const digits = raw.replace(/\D/g, "");

  if (digits.length < 7) {
    return raw;
  }

  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

function formatUserId(user = {}) {
  const rawId = String(user.id || "").trim();

  if (!rawId) {
    return "--";
  }

  const normalized = rawId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (!normalized) {
    return "--";
  }

  if (normalized.length <= 10) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}${normalized.slice(-6)}`;
}

Page({
  data: {
    pageState: "loading",
    errorMessage: "",
    user: {},
    phoneMasked: "",
    userIdLabel: "--",
    logoutSubmitting: false
  },
  async onShow() {
    await this.loadSettingsData();
  },
  async loadSettingsData() {
    this.setData({
      pageState: "loading",
      errorMessage: ""
    });

    try {
      const user = await mallService.getUser();
      const isLoggedIn = !!user && !!user.isAuthorized;

      if (!isLoggedIn) {
        wx.showToast({
          title: "请先登录",
          icon: "none"
        });
        wx.switchTab({
          url: "/pages/profile/index"
        });
        return;
      }

      this.setData({
        pageState: "success",
        user,
        phoneMasked: maskPhone(user.phone || user.mobile),
        userIdLabel: formatUserId(user)
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "设置页加载失败"
      });
    }
  },
  openAddressList() {
    wx.navigateTo({
      url: "/pages/address-list/index"
    });
  },
  openAuthPage() {
    wx.navigateTo({
      url: "/pages/auth/index"
    });
  },
  openMessageSettings() {
    wx.showToast({
      title: "消息通知设置即将上线",
      icon: "none"
    });
  },
  async handleLogout() {
    if (this.data.logoutSubmitting) {
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: "退出登录",
        content: "退出后将清除当前登录态，是否继续？",
        confirmText: "退出",
        confirmColor: "#C96B48",
        success(result) {
          resolve(!!(result && result.confirm));
        },
        fail() {
          resolve(false);
        }
      });
    });

    if (!confirmed) {
      return;
    }

    try {
      this.setData({
        logoutSubmitting: true
      });
      await mallService.logout();
      wx.showToast({
        title: "已退出登录",
        icon: "success"
      });
      wx.switchTab({
        url: "/pages/profile/index"
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "退出失败，请重试",
        icon: "none"
      });
      this.setData({
        logoutSubmitting: false
      });
      return;
    }

    this.setData({
      logoutSubmitting: false
    });
  },
  retryLoad() {
    this.loadSettingsData();
  }
});
