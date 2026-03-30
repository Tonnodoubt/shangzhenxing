const mallService = require("../../services/mall-client");

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function buildMetrics(profileData = {}) {
  const distributor = profileData.distributor || {};

  return [
    {
      id: "pending",
      label: "待结算佣金",
      value: `¥${formatMoney(distributor.pendingCommission || 0)}`
    },
    {
      id: "total",
      label: "累计佣金",
      value: `¥${formatMoney(distributor.totalCommission || 0)}`
    },
    {
      id: "team",
      label: "团队人数",
      value: String(distributor.teamCount || 0)
    },
    {
      id: "cart",
      label: "购物车商品",
      value: String(profileData.cartCount || 0)
    }
  ];
}

function buildCoreServices(profileData = {}) {
  const distributor = profileData.distributor || {};
  const coupons = profileData.coupons || [];
  const address = profileData.address || {};
  const user = profileData.user || {};

  return [
    {
      id: "orders",
      badge: "订单",
      title: "我的订单",
      subtitle: "查看待发货、待收货和已完成订单",
      action: "orders"
    },
    {
      id: "coupons",
      badge: "领券",
      title: "领券中心",
      subtitle: coupons.length ? `当前可用 ${coupons.length} 张优惠券` : "先领券再下单，更划算",
      action: "coupons"
    },
    {
      id: "addresses",
      badge: "地址",
      title: "收货地址",
      subtitle: address.receiver ? `默认收货人 ${address.receiver}` : "补一个常用地址，下单更快",
      action: "addresses"
    },
    {
      id: "after-sale",
      badge: "售后",
      title: "售后服务",
      subtitle: "申请售后或查看处理进度",
      action: "afterSaleOrders"
    },
    {
      id: "distribution",
      badge: "分销",
      title: "分销中心",
      subtitle: distributor.level ? `当前等级 ${distributor.level}` : "分享商品赚佣金",
      action: "distribution"
    },
    {
      id: "auth",
      badge: "账号",
      title: "账号授权",
      subtitle: user.isAuthorized ? "当前账号已完成授权" : "先完成授权，权益同步更完整",
      action: "auth"
    }
  ];
}

function buildMoreServices(profileData = {}) {
  const distributor = profileData.distributor || {};
  const address = profileData.address || {};
  const pendingCommission = Number(distributor.pendingCommission || 0);

  return [
    {
      id: "pending-orders",
      title: "待发货订单",
      copy: "快速查看最近待处理订单",
      value: "去查看",
      action: "pendingOrders",
      label: "待发货订单"
    },
    {
      id: "team-overview",
      title: "我的团队",
      copy: distributor.teamCount
        ? `已邀请 ${distributor.teamCount} 位成员`
        : "从第一位好友开始沉淀团队",
      value: distributor.teamCount ? `${distributor.teamCount} 人` : "去查看",
      action: "team",
      label: "我的团队"
    },
    {
      id: "commission-overview",
      title: "佣金明细",
      copy: pendingCommission
        ? `当前待结算佣金 ¥${formatMoney(pendingCommission)}`
        : "每笔分佣到账后都能在这里查看",
      value: "进入",
      action: "commissions",
      label: "佣金明细"
    },
    {
      id: "address-default",
      title: "默认收货人",
      copy: address.detail || "还没有默认地址",
      value: address.receiver || "去设置",
      action: "addresses",
      label: "默认收货人"
    }
  ];
}

function buildProfileViewModel(profileData = {}) {
  return {
    ...profileData,
    metrics: buildMetrics(profileData),
    coreServices: buildCoreServices(profileData),
    moreServices: buildMoreServices(profileData),
    pageState: "success",
    errorMessage: ""
  };
}

Page({
  data: {
    user: {},
    address: {},
    coupons: [],
    cartCount: 0,
    runtimeOrderCount: 0,
    distributor: {},
    metrics: [],
    coreServices: [],
    moreServices: [],
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
  openPendingOrders() {
    wx.navigateTo({
      url: "/pages/orders/index?status=pending"
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
  openCoupons() {
    wx.navigateTo({
      url: "/pages/coupons/index"
    });
  },
  openDistribution() {
    wx.navigateTo({
      url: "/pages/distribution/index"
    });
  },
  openCommissions() {
    wx.navigateTo({
      url: "/pages/commissions/index"
    });
  },
  openTeam() {
    wx.navigateTo({
      url: "/pages/team/index"
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

    if (action === "pendingOrders") {
      this.openPendingOrders();
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

    if (action === "coupons") {
      this.openCoupons();
      return;
    }

    if (action === "distribution") {
      this.openDistribution();
      return;
    }

    if (action === "team") {
      this.openTeam();
      return;
    }

    if (action === "commissions") {
      this.openCommissions();
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
