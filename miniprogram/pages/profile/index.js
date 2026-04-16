const mallService = require("../../services/mall-client");
const WECHAT_PROFILE_STORAGE_KEY = "wechat-mini-shop:wechat-profile";
const GENERIC_NICKNAMES = ["微信用户", "访客用户", "商城用户"];
const AVATAR_COLOR_PALETTE = [
  ["#F16F6A", "#DD5653"],
  ["#5E9DF8", "#4B7DD9"],
  ["#58B49A", "#3D8D76"],
  ["#D9905A", "#B86A3E"],
  ["#8B79D8", "#6E57B8"],
  ["#5CA6A1", "#3E7D79"]
];

function normalizeNickname(value) {
  return String(value || "").trim();
}

function isMeaningfulNickname(value) {
  const normalized = normalizeNickname(value);

  if (!normalized) {
    return false;
  }

  return !GENERIC_NICKNAMES.includes(normalized);
}

function readCachedWechatProfile() {
  try {
    const cached = wx.getStorageSync(WECHAT_PROFILE_STORAGE_KEY);
    const profile = cached && typeof cached === "object" ? cached : {};

    return {
      nickname: normalizeNickname(profile.nickname),
      avatarUrl: String(profile.avatarUrl || "").trim()
    };
  } catch (error) {
    console.warn("[profile][readCachedWechatProfile]", error && error.message ? error.message : error);
    return {
      nickname: "",
      avatarUrl: ""
    };
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return fallback;
}

function formatMoney(value) {
  return toNumber(value).toFixed(2);
}

function formatDisplayUserId(user = {}) {
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

function getPhoneLabel(user = {}) {
  return String(user.phone || user.mobile || "").trim();
}

function maskPhone(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.length < 7) {
    return "";
  }

  const normalized = digits.length >= 11 ? digits.slice(-11) : digits;

  if (normalized.length < 7) {
    return "";
  }

  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

function getAvatarUrl(user = {}, cachedWechatProfile = {}) {
  const candidates = [
    user.avatarUrl,
    user.avatar,
    user.headImgUrl,
    user.headimgurl,
    user.wechatAvatarUrl,
    cachedWechatProfile.avatarUrl
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    const normalized = String(candidates[i] || "").trim();

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function isUserLoggedIn(user = {}) {
  return !!user.isAuthorized;
}

function isMaskedPhoneLike(value) {
  return /^\d{3}\*{4}\d{4}$/.test(String(value || "").trim());
}

function getAvatarLabel(displayName = "", isLoggedIn = false) {
  const source = isLoggedIn ? normalizeNickname(displayName) : "登";

  if (isLoggedIn && isMaskedPhoneLike(source)) {
    return "微";
  }

  if (source) {
    return source.slice(0, 1);
  }

  return isLoggedIn ? "微" : "登";
}

function resolveHeaderTitle(user = {}, cachedWechatProfile = {}, isLoggedIn = false) {
  if (!isLoggedIn) {
    return "登录/注册";
  }

  const nickname = normalizeNickname(user.nickname);
  const cachedNickname = normalizeNickname(cachedWechatProfile.nickname);

  if (isMeaningfulNickname(nickname)) {
    return nickname;
  }

  if (cachedNickname) {
    return cachedNickname;
  }

  const phoneMasked = maskPhone(user.phone || user.mobile);

  if (phoneMasked) {
    return phoneMasked;
  }

  if (nickname) {
    return nickname;
  }

  return "微信用户";
}

function hashSeed(value = "") {
  const source = String(value || "");
  let hash = 0;

  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function buildAvatarStyle(user = {}, headerTitle = "", headerAvatar = "", isLoggedIn = false) {
  if (!isLoggedIn || headerAvatar) {
    return "";
  }

  const seedBase = [
    String(user.id || "").trim(),
    String(user.phone || user.mobile || "").trim(),
    normalizeNickname(user.nickname),
    normalizeNickname(headerTitle)
  ].join("|");
  const seed = hashSeed(seedBase || "guest");
  const palette = AVATAR_COLOR_PALETTE[seed % AVATAR_COLOR_PALETTE.length];

  return `background: radial-gradient(circle at 35% 30%, ${palette[0]} 0%, ${palette[1]} 100%);`;
}

function countAvailableCoupons(coupons = []) {
  return (coupons || []).filter((item) => item && item.status === "available").length;
}

function buildRegionLabel(profileData = {}, isLoggedIn = false) {
  const address = profileData.address || {};
  const province = String(address.province || "").trim();
  const city = String(address.city || "").trim();

  if (province || city) {
    return [province, city].filter((item) => !!item).join(" | ");
  }

  return isLoggedIn ? "同步你的常用收货地区" : "登录后同步常用地区";
}

function buildWalletStats(profileData = {}, isLoggedIn = false) {
  const distributor = profileData.distributor || {};
  const todayIncome = distributor.todayIncome
    ?? distributor.todayCommission
    ?? distributor.todayEarning
    ?? 0;

  return [
    {
      id: "withdrawable",
      label: "可提现（元）",
      value: isLoggedIn ? formatMoney(distributor.pendingCommission) : "0.00"
    },
    {
      id: "total-reward",
      label: "累计奖励（元）",
      value: isLoggedIn ? formatMoney(distributor.totalCommission) : "0.00"
    },
    {
      id: "today-income",
      label: "今日收益（元）",
      value: isLoggedIn ? formatMoney(todayIncome) : "0.00"
    }
  ];
}

function buildFeatureEntries() {
  return [
    {
      id: "orders",
      label: "我的订单",
      action: "orders",
      icon: "/assets/profile-icons/orders.svg"
    },
    {
      id: "coupons",
      label: "优惠券",
      action: "coupons",
      icon: "/assets/profile-icons/coupon.svg"
    },
    {
      id: "addresses",
      label: "收货地址",
      action: "addresses",
      icon: "/assets/profile-icons/address.svg"
    },
    {
      id: "after-sale",
      label: "售后服务",
      action: "afterSale",
      icon: "/assets/profile-icons/after-sale.svg"
    }
  ];
}

function buildProfileViewModel(profileData = {}, options = {}) {
  const user = profileData.user || {};
  const cachedWechatProfile = options.cachedWechatProfile || {};
  const isLoggedIn = isUserLoggedIn(user);
  const phoneLabel = maskPhone(getPhoneLabel(user));
  const headerTitle = resolveHeaderTitle(user, cachedWechatProfile, isLoggedIn);
  const headerAvatar = isLoggedIn ? getAvatarUrl(user, cachedWechatProfile) : "";
  const headerAvatarStyle = buildAvatarStyle(user, headerTitle, headerAvatar, isLoggedIn);
  const couponCount = isLoggedIn ? countAvailableCoupons(profileData.coupons || []) : 0;

  return {
    user,
    isLoggedIn,
    headerAvatar,
    headerAvatarStyle,
    headerAvatarLabel: getAvatarLabel(headerTitle, isLoggedIn),
    headerTitle,
    headerSubtitle: buildRegionLabel(profileData, isLoggedIn),
    phoneLabel,
    userIdLabel: formatDisplayUserId(user),
    couponHint: couponCount > 0 ? `可用 ${couponCount} 张` : "去领取",
    walletStats: buildWalletStats(profileData, isLoggedIn),
    featureEntries: buildFeatureEntries(),
    pageState: "success",
    errorMessage: ""
  };
}

Page({
  data: {
    user: {},
    isLoggedIn: false,
    headerAvatar: "",
    headerAvatarStyle: "",
    headerAvatarLabel: "登",
    headerTitle: "",
    headerSubtitle: "",
    phoneLabel: "",
    userIdLabel: "",
    couponHint: "",
    walletStats: [],
    featureEntries: [],
    pageState: "loading",
    errorMessage: "",
    showLoginSheet: false,
    loginAgreed: false,
    loginSubmitting: false,
    loginErrorMessage: ""
  },
  async onShow() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: ""
      });

      const profileData = await mallService.getProfileData();
      const viewModel = buildProfileViewModel(profileData, {
        cachedWechatProfile: readCachedWechatProfile()
      });

      this.setData({
        ...viewModel,
        showLoginSheet: viewModel.isLoggedIn ? false : this.data.showLoginSheet,
        loginSubmitting: false
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "我的页面加载失败",
        showLoginSheet: false,
        loginSubmitting: false
      });
    }
  },
  handleProfileHeaderTap() {
    this.openSettings();
  },
  handleTopBackTap() {
    this.openHome();
  },
  ensureLoggedIn() {
    if (this.data.pageState !== "success") {
      return false;
    }

    if (this.data.isLoggedIn) {
      return true;
    }

    this.openLoginSheet();
    return false;
  },
  handleHeaderActionTap(event) {
    const { label } = event.currentTarget.dataset || {};

    if (label === "设置") {
      this.openSettings();
      return;
    }

    if (!this.ensureLoggedIn()) {
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
  openLoginSheet() {
    if (this.data.pageState !== "success" || this.data.isLoggedIn) {
      return;
    }

    this.setData({
      showLoginSheet: true,
      loginErrorMessage: ""
    });
  },
  closeLoginSheet() {
    if (this.data.loginSubmitting) {
      return;
    }

    this.setData({
      showLoginSheet: false,
      loginErrorMessage: ""
    });
  },
  preventSheetClose() {},
  toggleLoginAgreement() {
    if (this.data.loginSubmitting || !this.data.showLoginSheet) {
      return;
    }

    this.setData({
      loginAgreed: !this.data.loginAgreed,
      loginErrorMessage: ""
    });
  },
  notifyAgreementRequired() {
    wx.showToast({
      title: "请先阅读并同意协议",
      icon: "none"
    });
  },
  handleAgreementLinkTap(event) {
    const { type } = event.currentTarget.dataset;
    const url = type === "privacy"
      ? "/pages/privacy-policy/index"
      : "/pages/service-terms/index";

    wx.navigateTo({
      url
    });
  },
  async syncProfileAfterLogin(successMessage = "登录成功") {
    const profileData = await mallService.getProfileData();
    const viewModel = buildProfileViewModel(profileData, {
      cachedWechatProfile: readCachedWechatProfile()
    });

    this.setData({
      ...viewModel,
      showLoginSheet: false,
      loginSubmitting: false,
      loginErrorMessage: ""
    });

    wx.showToast({
      title: successMessage,
      icon: "success"
    });
  },
  async handleGetPhoneNumber(event) {
    if (
      this.data.pageState !== "success"
      || this.data.loginSubmitting
    ) {
      return;
    }

    if (!this.data.loginAgreed) {
      this.notifyAgreementRequired();
      return;
    }

    const detail = (event && event.detail) || {};
    const errMsg = String(detail.errMsg || "").trim();
    const phoneCode = String(detail.code || "").trim();

    if (!phoneCode) {
      const message = errMsg.indexOf("user deny") > -1
        ? "你已取消微信手机号授权"
        : (errMsg || "没有拿到手机号授权 code");

      this.setData({
        loginErrorMessage: message
      });
      wx.showToast({
        title: message,
        icon: "none"
      });
      return;
    }

    try {
      this.setData({
        loginSubmitting: true,
        loginErrorMessage: ""
      });

      await mallService.refreshSession();
      await mallService.authorizeUser({
        phoneCode
      });
    } catch (error) {
      const message = error.message || "微信登录失败，请稍后重试";

      this.setData({
        loginSubmitting: false,
        loginErrorMessage: message
      });
      wx.showToast({
        title: message,
        icon: "none"
      });
      return;
    }
    await this.syncProfileAfterLogin("登录成功");
  },
  openOrders(statusOrEvent) {
    if (!this.ensureLoggedIn()) {
      return;
    }

    let status = "all";

    if (typeof statusOrEvent === "string") {
      status = statusOrEvent;
    } else if (statusOrEvent && statusOrEvent.currentTarget) {
      status = statusOrEvent.currentTarget.dataset.status || "all";
    }

    const query = status && status !== "all" ? `?status=${status}` : "";

    wx.navigateTo({
      url: `/pages/orders/index${query}`
    });
  },
  openAfterSaleOrders() {
    this.openOrders("all");
  },
  openAddresses() {
    if (!this.ensureLoggedIn()) {
      return;
    }

    wx.navigateTo({
      url: "/pages/address-list/index"
    });
  },
  openCoupons() {
    if (!this.ensureLoggedIn()) {
      return;
    }

    wx.navigateTo({
      url: "/pages/coupons/index"
    });
  },
  openSettings() {
    if (!this.ensureLoggedIn()) {
      return;
    }

    wx.navigateTo({
      url: "/pages/auth/index"
    });
  },
  handleWalletActionTap(event) {
    if (!this.ensureLoggedIn()) {
      return;
    }

    const { label } = event.currentTarget.dataset;

    this.showPlaceholder({
      currentTarget: {
        dataset: {
          label: label || "资金操作"
        }
      }
    });
  },
  handleFeatureTap(event) {
    if (!this.ensureLoggedIn()) {
      return;
    }

    const { action, label } = event.currentTarget.dataset;

    if (action === "orders") {
      this.openOrders("all");
      return;
    }

    if (action === "coupons") {
      this.openCoupons();
      return;
    }

    if (action === "addresses") {
      this.openAddresses();
      return;
    }

    if (action === "afterSale") {
      this.openAfterSaleOrders();
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
    const { label } = event.currentTarget.dataset || {};
    const title = label ? `${label}即将上线` : "功能即将上线";

    wx.showToast({
      title,
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
