const catalogService = require("../../services/catalog");
const mallService = require("../../services/mall-client");

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function getCommissionRate(distributor) {
  const level = (distributor && distributor.level) || "";

  if (level.indexOf("高级") > -1 || level.indexOf("合伙人") > -1) {
    return 0.08;
  }

  return 0.05;
}

function sortQuickEntries(list = []) {
  const priorityMap = {
    coupons: 0,
    distribution: 1,
    orders: 2,
    cart: 3,
    category: 4
  };

  return list.slice().sort((left, right) => {
    const leftPriority = Object.prototype.hasOwnProperty.call(priorityMap, left.action)
      ? priorityMap[left.action]
      : 99;
    const rightPriority = Object.prototype.hasOwnProperty.call(priorityMap, right.action)
      ? priorityMap[right.action]
      : 99;

    return leftPriority - rightPriority;
  });
}

function buildHeroBadges(profileData = {}) {
  const coupons = profileData.coupons || [];
  const cartCount = Number(profileData.cartCount || 0);
  const runtimeOrderCount = Number(profileData.runtimeOrderCount || 0);
  const user = profileData.user || {};

  return [
    {
      id: "auth",
      text: user.isAuthorized ? "已完成授权，下单和权益查看更顺畅" : "完成授权后可同步订单和会员权益"
    },
    {
      id: "coupon",
      text: coupons.length ? `${coupons.length} 张优惠券待使用` : "先领新人券，下单更省"
    },
    {
      id: "cart",
      text: cartCount ? `购物车已有 ${cartCount} 件待结算商品` : "先把心仪商品加入购物车"
    },
    {
      id: "order",
      text: runtimeOrderCount ? `最近新增 ${runtimeOrderCount} 笔订单` : "下单后可在订单中心持续查看进度"
    }
  ];
}

function decorateBanners(list = [], profileData = {}) {
  const coupons = profileData.coupons || [];
  const distributor = profileData.distributor || {};

  return (list || []).map((item, index) => {
    const isCouponBanner = index === 0;

    return {
      ...item,
      action: isCouponBanner ? "coupons" : "distribution",
      meta: isCouponBanner
        ? (coupons.length ? `当前可直接使用 ${coupons.length} 张券` : "新人券和满减券都已准备好")
        : `当前待结算佣金 ¥${formatMoney(distributor.pendingCommission || 0)}`,
      linkText: isCouponBanner ? "去领券" : "去分销"
    };
  });
}

function decorateProducts(list = [], distributor = {}) {
  const commissionRate = getCommissionRate(distributor);

  return list.map((item, index) => {
    const highlightTags = Array.isArray(item.highlights) ? item.highlights.slice(0, 2) : [];
    const specCount = Array.isArray(item.specs) ? item.specs.length : 0;

    return {
      ...item,
      distributionHint: `分享成交预计赚 ¥${formatMoney(Number(item.price || 0) * commissionRate)}`,
      couponHint: index % 2 === 0 ? "下单可叠加优惠券" : "适合分享给好友",
      distributionBadge: item.distributionEnabled === false ? "自购推荐" : "分享有佣金",
      specSummary: specCount ? `${specCount} 个规格可选` : "默认规格已就绪",
      highlightTags
    };
  });
}

function buildBenefitCards(profileData = {}) {
  const coupons = profileData.coupons || [];
  const distributor = profileData.distributor || {};

  return [
    {
      id: "coupon",
      action: "coupons",
      badge: coupons.length ? `${coupons.length} 张可用券` : "新人券已就绪",
      title: "领券中心",
      subtitle: "新人券、满减券先领再下单，结算时更划算。",
      meta: `当前可直接使用 ${coupons.length} 张`
    },
    {
      id: "distribution",
      action: "distribution",
      badge: distributor.level || "分享权益",
      title: "分销中心",
      subtitle: "分享主推商品给好友，成交后佣金会自动累计。",
      meta: `待结算 ¥${formatMoney(distributor.pendingCommission || 0)}`
    }
  ];
}

function buildHomeStats(profileData = {}) {
  const distributor = profileData.distributor || {};
  const coupons = profileData.coupons || [];

  return [
    {
      label: "待结算佣金",
      value: `¥${formatMoney(distributor.pendingCommission || 0)}`
    },
    {
      label: "累计佣金",
      value: `¥${formatMoney(distributor.totalCommission || 0)}`
    },
    {
      label: "团队人数",
      value: String(distributor.teamCount || 0)
    },
    {
      label: "可用优惠券",
      value: String(coupons.length)
    }
  ];
}

function buildHomeViewModel(homeData = {}, profileData = {}) {
  return {
    user: profileData.user || {},
    banners: decorateBanners(homeData.banners || [], profileData),
    heroBadges: buildHeroBadges(profileData),
    benefitCards: buildBenefitCards(profileData),
    homeStats: buildHomeStats(profileData),
    quickEntries: sortQuickEntries(homeData.quickEntries || []),
    featuredProducts: decorateProducts(homeData.featuredProducts || [], profileData.distributor || {}),
    recommendedProducts: decorateProducts(homeData.recommendedProducts || [], profileData.distributor || {}),
    pageState: "success",
    errorMessage: ""
  };
}

Page({
  data: {
    user: {},
    banners: [],
    heroBadges: [],
    benefitCards: [],
    homeStats: [],
    quickEntries: [],
    featuredProducts: [],
    recommendedProducts: [],
    pageState: "loading",
    errorMessage: ""
  },
  async onShow() {
    await this.loadHomeData();
  },
  async loadHomeData() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: ""
      });

      wx.showNavigationBarLoading();
      const [homeData, profileData] = await Promise.all([
        catalogService.getHomeData(),
        mallService.getProfileData()
      ]);

      this.setData(buildHomeViewModel(homeData, profileData));
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "首页加载失败"
      });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },
  handleSearch() {
    wx.navigateTo({
      url: "/pages/search/index"
    });
  },
  handleEntryTap(event) {
    const { action } = event.currentTarget.dataset;

    if (action === "orders") {
      wx.navigateTo({
        url: "/pages/orders/index"
      });
      return;
    }

    if (action === "cart") {
      wx.switchTab({
        url: "/pages/cart/index"
      });
      return;
    }

    if (action === "coupons") {
      wx.navigateTo({
        url: "/pages/coupons/index"
      });
      return;
    }

    if (action === "distribution") {
      wx.navigateTo({
        url: "/pages/distribution/index"
      });
      return;
    }

    wx.switchTab({
      url: "/pages/category/index"
    });
  },
  openProduct(event) {
    const { id } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/product/index?id=${id}`
    });
  },
  retryLoad() {
    this.loadHomeData();
  },
  openCategory() {
    wx.switchTab({
      url: "/pages/category/index"
    });
  }
});
