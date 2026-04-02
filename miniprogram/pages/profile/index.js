const mallService = require("../../services/mall-client");

function formatAddressSummary(address = {}) {
  if (!address.receiver) {
    return "补一个常用地址，下单更快";
  }

  return address.phone ? `${address.receiver} · ${address.phone}` : address.receiver;
}

function buildServiceRows(profileData = {}) {
  const address = profileData.address || {};
  const user = profileData.user || {};
  const runtimeOrderCount = Number(profileData.runtimeOrderCount || 0);

  return [
    {
      id: "orders",
      title: "我的订单",
      copy: runtimeOrderCount ? `最近新增 ${runtimeOrderCount} 笔订单` : "查看待发货、待收货和已完成订单",
      value: "查看",
      action: "orders",
      label: "我的订单"
    },
    {
      id: "addresses",
      title: "收货地址",
      copy: formatAddressSummary(address),
      value: address.receiver || "设置",
      action: "addresses",
      label: "收货地址"
    },
    {
      id: "auth",
      title: "账号授权",
      copy: user.isAuthorized ? "当前账号已完成授权" : "先完成授权，权益同步更完整",
      value: user.isAuthorized ? "已授权" : "去授权",
      action: "auth",
      label: "账号授权"
    },
    {
      id: "after-sale",
      title: "售后服务",
      copy: "申请售后或查看处理进度",
      value: "进入",
      action: "afterSaleOrders",
      label: "售后服务"
    }
  ];
}

function buildProfileViewModel(profileData = {}) {
  return {
    user: profileData.user || {},
    serviceRows: buildServiceRows(profileData),
    pageState: "success",
    errorMessage: ""
  };
}

Page({
  data: {
    user: {},
    serviceRows: [],
    pageState: "loading",
    errorMessage: ""
  },
  async onShow() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: ""
      });

      const profileData = await mallService.getProfileData();

      this.setData(buildProfileViewModel(profileData));
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "我的页面加载失败"
      });
    }
  },
  openAuth() {
    wx.navigateTo({
      url: "/pages/auth/index"
    });
  },
  openOrders() {
    wx.navigateTo({
      url: "/pages/orders/index"
    });
  },
  openAfterSaleOrders() {
    wx.navigateTo({
      url: "/pages/orders/index"
    });
  },
  openAddresses() {
    wx.navigateTo({
      url: "/pages/address-list/index"
    });
  },
  handleServiceTap(event) {
    if (this.data.pageState !== "success") {
      return;
    }

    const { action, label } = event.currentTarget.dataset;

    if (action === "auth") {
      this.openAuth();
      return;
    }

    if (action === "orders") {
      this.openOrders();
      return;
    }

    if (action === "afterSaleOrders") {
      this.openAfterSaleOrders();
      return;
    }

    if (action === "addresses") {
      this.openAddresses();
      return;
    }

    this.showPlaceholder({
      currentTarget: {
        dataset: {
          label: label || "该功能"
        }
      }
    });
  },
  showPlaceholder(event) {
    const { label } = event.currentTarget.dataset;

    wx.showToast({
      title: `${label}后续补`,
      icon: "none"
    });
  },
  retryLoad() {
    this.onShow();
  },
  openHome() {
    wx.switchTab({
      url: "/pages/home/index"
    });
  }
});
