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
    copy: (banners[0] || {}).subtitle || "把新人券、主推商品和分销入口收在同一屏，首页更像品牌门面。",
    statusText: user.isAuthorized ? "已授权" : "预览态",
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
      : "首页先把福利入口放前面，新人券和常用满减都从这里进入。",
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
    copy: product.shortDesc || "这里适合放一张首页主推图，把故事感和商品感一起拉出来。"
  };
}

function buildHomeViewModel(homeData = {}, profileData = {}, categories = []) {
  const categoryNav = buildCategoryNav(categories);

  return {
    user: profileData.user || {},
    hero: buildHero(homeData, categoryNav, profileData),
    categoryNav,
    benefitCard: buildBenefitCard(profileData),
    featureStory: buildFeatureStory(homeData),
    productGrid: (homeData.recommendedProducts || []).slice(0, 4).map((item) => buildProductCard(item)),
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
      const [homeData, profileData, categories] = await Promise.all([
        catalogService.getHomeData(),
        mallService.getProfileData(),
        catalogService.getCategories()
      ]);

      this.setData(buildHomeViewModel(homeData, profileData, categories));
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
  retryLoad() {
    this.loadHomeData();
  }
});
