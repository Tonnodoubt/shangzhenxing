const mallService = require("../../services/mall-client");
const WECHAT_PROFILE_STORAGE_KEY = "wechat-mini-shop:wechat-profile";
const GENERIC_NICKNAMES = ["微信用户", "访客用户", "商城用户"];

function normalizeNickname(value) {
  return String(value || "").trim();
}

function isMeaningfulNickname(value) {
  const nickname = normalizeNickname(value);

  if (!nickname) {
    return false;
  }

  return !GENERIC_NICKNAMES.includes(nickname);
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
    console.warn("[auth][readCachedWechatProfile]", error && error.message ? error.message : error);
    return {
      nickname: "",
      avatarUrl: ""
    };
  }
}

function saveCachedWechatProfile(profile = {}) {
  const nextProfile = {
    nickname: normalizeNickname(profile.nickname),
    avatarUrl: String(profile.avatarUrl || "").trim()
  };

  try {
    wx.setStorageSync(WECHAT_PROFILE_STORAGE_KEY, nextProfile);
  } catch (error) {
    console.warn("[auth][saveCachedWechatProfile]", error && error.message ? error.message : error);
  }

  return nextProfile;
}

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

function isMaskedPhoneLike(value) {
  return /^\d{3}\*{4}\d{4}$/.test(String(value || "").trim());
}

function resolveAvatarLabel(nickname = "") {
  const normalized = normalizeNickname(nickname);

  if (isMaskedPhoneLike(normalized)) {
    return "微";
  }

  if (normalized) {
    return normalized.slice(0, 1);
  }

  return "微";
}

Page({
  data: {
    pageState: "loading",
    errorMessage: "",
    user: {},
    displayAvatarUrl: "",
    displayAvatarLabel: "微",
    phoneMasked: "",
    userIdLabel: "--",
    logoutSubmitting: false,
    nicknameDisplay: "去设置",
    profileNickname: "",
    profileSaving: false
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

      const cachedWechatProfile = readCachedWechatProfile();
      const userNickname = normalizeNickname(user.nickname);
      const cachedNickname = normalizeNickname(cachedWechatProfile.nickname);
      const phoneMasked = maskPhone(user.phone || user.mobile);
      const preferredNickname = isMeaningfulNickname(userNickname)
        ? userNickname
        : (isMeaningfulNickname(cachedNickname) ? cachedNickname : "");
      const displayNickname = preferredNickname || phoneMasked || "微信用户";
      const displayAvatarUrl = String(user.avatarUrl || cachedWechatProfile.avatarUrl || "").trim();

      this.setData({
        pageState: "success",
        user: {
          ...user,
          nickname: displayNickname,
          avatarUrl: displayAvatarUrl
        },
        displayAvatarUrl,
        displayAvatarLabel: resolveAvatarLabel(displayNickname),
        phoneMasked,
        userIdLabel: formatUserId(user),
        nicknameDisplay: preferredNickname || "去设置",
        profileNickname: preferredNickname
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "设置页加载失败"
      });
    }
  },
  async applyProfileUpdate(payload = {}) {
    const nickname = normalizeNickname(payload.nickname);
    const avatarUrl = String(payload.avatarUrl || "").trim();

    if (!nickname && !avatarUrl) {
      wx.showToast({
        title: "请先设置头像或昵称",
        icon: "none"
      });
      return;
    }

    try {
      this.setData({
        profileSaving: true
      });

      const updatedUser = await mallService.authorizeUser({
        nickname,
        avatarUrl
      });
      const nextNickname = normalizeNickname(updatedUser.nickname || nickname || this.data.profileNickname);
      const nextAvatarUrl = String(updatedUser.avatarUrl || avatarUrl || this.data.displayAvatarUrl || "").trim();
      const phoneMasked = maskPhone(updatedUser.phone || updatedUser.mobile || this.data.user.phone || this.data.user.mobile);
      const displayNickname = isMeaningfulNickname(nextNickname)
        ? nextNickname
        : (phoneMasked || "微信用户");

      saveCachedWechatProfile({
        nickname: nextNickname,
        avatarUrl: nextAvatarUrl
      });

      this.setData({
        user: {
          ...this.data.user,
          ...updatedUser,
          nickname: displayNickname,
          avatarUrl: nextAvatarUrl
        },
        displayAvatarUrl: nextAvatarUrl,
        displayAvatarLabel: resolveAvatarLabel(displayNickname),
        phoneMasked,
        nicknameDisplay: isMeaningfulNickname(nextNickname) ? nextNickname : "去设置",
        profileNickname: isMeaningfulNickname(nextNickname) ? nextNickname : "",
        profileSaving: false
      });

      wx.showToast({
        title: "已保存",
        icon: "success"
      });
    } catch (error) {
      this.setData({
        profileSaving: false
      });
      wx.showToast({
        title: error.message || "保存失败，请重试",
        icon: "none"
      });
    }
  },
  async handleChooseAvatar(event) {
    if (this.data.profileSaving) {
      return;
    }

    const avatarUrl = String(((event || {}).detail || {}).avatarUrl || "").trim();

    if (!avatarUrl) {
      return;
    }

    await this.applyProfileUpdate({
      nickname: this.data.profileNickname,
      avatarUrl
    });
  },
  async handleEditNicknameTap() {
    if (this.data.profileSaving) {
      return;
    }

    const result = await new Promise((resolve) => {
      wx.showModal({
        title: "设置昵称",
        editable: true,
        placeholderText: "请输入昵称",
        content: this.data.profileNickname || "",
        confirmText: "保存",
        success(modalResult) {
          resolve(modalResult || {});
        },
        fail() {
          resolve({});
        }
      });
    });

    if (!result.confirm) {
      return;
    }

    const nickname = normalizeNickname(result.content);

    if (!nickname) {
      wx.showToast({
        title: "昵称不能为空",
        icon: "none"
      });
      return;
    }

    await this.applyProfileUpdate({
      nickname,
      avatarUrl: this.data.displayAvatarUrl
    });
  },
  openAddressList() {
    wx.navigateTo({
      url: "/pages/address-list/index"
    });
  },
  openPrivacyPolicy() {
    wx.navigateTo({
      url: "/pages/privacy-policy/index"
    });
  },
  openServiceTerms() {
    wx.navigateTo({
      url: "/pages/service-terms/index"
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
