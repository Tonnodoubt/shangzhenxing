const catalogService = require("../../services/catalog");
const mallService = require("../../services/mall-client");

const CATEGORY_THEME_MAP = {
  gift: {
    sealText: "礼",
    accent: "linear-gradient(135deg, #efe3c9, #d9b989)"
  },
  drink: {
    sealText: "饮",
    accent: "linear-gradient(135deg, #dfe8d6, #9db889)"
  },
  home: {
    sealText: "居",
    accent: "linear-gradient(135deg, #ece4d8, #c4a98a)"
  },
  digital: {
    sealText: "器",
    accent: "linear-gradient(135deg, #e1eadc, #8aa58c)"
  }
};

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function truncateText(value, limit = 12) {
  const text = String(value || "").trim();

  if (!text || text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit)}...`;
}

function buildCategoryNav(categories = []) {
  return (categories || [])
    .filter((item) => item.id !== "all")
    .slice(0, 4)
    .map((item) => {
      const theme = CATEGORY_THEME_MAP[item.id] || {};

      return {
        id: item.id,
        name: item.name || "",
        sealText: theme.sealText || String(item.name || "品").slice(0, 1),
        accent: theme.accent || "linear-gradient(135deg, #f0e5d8, #d9c6a8)"
      };
    });
}

function buildProductCard(product = {}) {
  return {
    id: product.id || "",
    title: product.title || "",
    shortTitle: truncateText(product.title, 10),
    shortDesc: product.shortDesc || "",
    displayPrice: product.displayPrice || formatMoney(product.price),
    displayMarketPrice: product.displayMarketPrice || formatMoney(product.marketPrice),
    coverLabel: product.coverLabel || "好物",
    accent: product.accent || "#d8e4d8",
    salesText: product.salesText || "",
    tag: product.tag || "精选"
  };
}

function buildHero(homeData = {}, categoryNav = [], profileData = {}) {
  const banners = homeData.banners || [];
  const heroProduct = buildProductCard((homeData.featuredProducts || [])[0] || {});
  const user = profileData.user || {};

  return {
    titleTop: (banners[0] || {}).title || "新人福利专区",
    titleBottom: (banners[1] || {}).title || "分享爆款赚佣金",
    copy: (banners[0] || {}).subtitle || "新人福利、主推商品和分销入口一屏可见，逛起来更高效。",
    statusText: user.isAuthorized ? "已授权" : "未登录",
    product: heroProduct,
    backdropWords: categoryNav.map((item, index) => ({
      id: `backdrop-${item.id}`,
      text: item.sealText,
      className: `hero-backdrop-word-${index + 1}`
    })),
    dots: (banners.length ? banners : [{ id: "fallback-banner" }]).slice(0, 5).map((item, index) => ({
      id: item.id || `dot-${index}`,
      active: index === 0
    }))
  };
}

function buildBenefitCard(profileData = {}) {
  const coupons = (profileData.coupons || []).filter((item) => item.status === "available");
  const distributor = profileData.distributor || {};

  return {
    badge: coupons.length ? `${coupons.length} 张可用券` : "新人券已备好",
    title: "领券下单 分享赚佣",
    copy: coupons.length
      ? `${coupons.length} 张常用券已经集中在这里，先领券再下单会更顺手。`
      : "新人券和常用满减券都在这里，领券后下单更划算。",
    footer: distributor.teamCount
      ? `团队 ${distributor.teamCount} 人 · 待结算 ¥${formatMoney(distributor.pendingCommission || 0)}`
      : "分销主链已接通，分享后的团队和佣金会继续沉淀。",
    primaryText: "去领券",
    secondaryText: "分销中心"
  };
}

function buildFeatureStory(homeData = {}) {
  const source = (homeData.featuredProducts || [])[1] || (homeData.recommendedProducts || [])[0] || {};
  const product = buildProductCard(source);

  return {
    ...product,
    kicker: product.tag || "主推",
    title: product.title || "主推专题位",
    copy: product.shortDesc || "甄选主推商品，兼顾品质与性价比。"
  };
}

function buildHomeViewModel(homeData = {}, profileData = {}, categories = []) {
  const categoryNav = buildCategoryNav(categories);
  const banners = homeData.banners || [];
  const pageSections = (homeData.pageSections || [])
    .filter((section) => section.visible !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const theme = homeData.theme || {};

  return {
    user: profileData.user || {},
    hero: buildHero(homeData, categoryNav, profileData),
    categoryNav,
    benefitCard: buildBenefitCard(profileData),
    featureStory: buildFeatureStory(homeData),
    productGrid: (homeData.recommendedProducts || []).slice(0, 4).map((item) => buildProductCard(item)),
    banners,
    pageSections,
    theme,
    activeBannerIndex: 0,
    pageState: "success",
    errorMessage: ""
  };
}

Page({
  data: {
    user: {},
    hero: {},
    categoryNav: [],
    benefitCard: {},
    featureStory: {},
    productGrid: [],
    banners: [],
    pageSections: [],
    theme: {},
    activeBannerIndex: 0,
    pageState: "loading",
    errorMessage: "",
    lastLoadTime: 0
  },
  async onShow() {
    const now = Date.now();
    if (this.data.pageState === "success" && now - this.data.lastLoadTime < 30000) return;
    await this.loadHomeData();
  },
  async loadHomeData() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: ""
      });

      wx.showNavigationBarLoading();
      const [homeData, profileData, categories] = await Promise.all([
        catalogService.getHomeData(),
        mallService.getProfileData(),
        catalogService.getCategories()
      ]);

      this.setData({
        ...buildHomeViewModel(homeData, profileData, categories),
        lastLoadTime: Date.now()
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "首页加载失败"
      });
    } finally {
      wx.hideNavigationBarLoading();
    }
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
  openProduct(event) {
    const { id } = event.currentTarget.dataset;

    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/product/index?id=${id}`
    });
  },
  openCategory(event) {
    const { id } = (event && event.currentTarget && event.currentTarget.dataset) || {};
    const app = getApp();

    if (app && app.globalData) {
      app.globalData.pendingCategoryId = id || "";
    }

    wx.switchTab({
      url: "/pages/category/index"
    });
  },
  swiperChange(e) {
    this.setData({
      activeBannerIndex: e.detail.current
    });
  },
  onBannerTap(e) {
    const { linkType, linkValue } = e.currentTarget.dataset;

    if (!linkType || !linkValue) {
      return;
    }

    if (linkType === "product") {
      wx.navigateTo({ url: `/pages/product/index?id=${linkValue}` });
    } else if (linkType === "category") {
      wx.switchTab({ url: "/pages/category/index" });
    } else if (linkType === "page") {
      wx.navigateTo({ url: linkValue });
    }
  },
  retryLoad() {
    this.loadHomeData();
  }
});
