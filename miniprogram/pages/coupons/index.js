const mallService = require("../../services/mall-client");

function buildTemplateRuleText(template = {}) {
  const threshold = Number(template.threshold || 0);
  const badge = String(template.badge || "").trim();

  if (badge.indexOf("新") > -1) {
    return `首单满${threshold}可用`;
  }

  return `满${threshold}可用`;
}

function decorateCenterTemplates(templates = [], actionLoadingId = "", actionType = "") {
  return templates.map((item) => ({
    ...item,
    amountText: String(Number(item.amount || 0)),
    ruleText: buildTemplateRuleText(item),
    actionText: item.claimed ? "已领取" : "立即领取",
    isLoading: actionLoadingId === item.id && actionType === "claim"
  }));
}

function decorateCouponList(coupons = [], mode = "manage", amount = 0, selectedCouponId = "", actionLoadingId = "", actionType = "") {
  return coupons.map((item) => {
    const threshold = Number(item.threshold || 0);
    const isAvailable = item.status === "available";
    const meetsThreshold = Number(amount || 0) >= threshold;
    let selectHint = "";

    if (mode === "select") {
      if (!isAvailable) {
        selectHint = "当前不可选";
      } else if (!meetsThreshold) {
        selectHint = `满${threshold}可用`;
      } else if (selectedCouponId === item.id) {
        selectHint = "当前已选";
      } else {
        selectHint = "点击使用";
      }
    }

    return {
      ...item,
      amountText: String(Number(item.amount || 0)),
      thresholdText: `满${threshold}可用`,
      statusLabel: isAvailable ? "可用" : "已使用",
      statusToneClass: isAvailable ? "coupon-ticket-status-available" : "coupon-ticket-status-disabled",
      selectHint,
      meetsThreshold,
      isSelectable: isAvailable && meetsThreshold,
      isSelecting: actionLoadingId === item.id && actionType === "select"
    };
  });
}

function buildCouponViewModel(payload = {}, mode = "manage", amount = 0, actionLoadingId = "", actionType = "") {
  const selectedCouponId = payload.selectedCouponId || "";

  return {
    centerTemplates: decorateCenterTemplates(payload.centerTemplates || [], actionLoadingId, actionType),
    coupons: decorateCouponList(payload.coupons || [], mode, amount, selectedCouponId, actionLoadingId, actionType),
    selectedCouponId,
    availableCouponCount: (payload.coupons || []).filter((item) => item.status === "available").length,
    pageState: "success",
    errorMessage: ""
  };
}

Page({
  data: {
    mode: "manage",
    amount: 0,
    displayAmount: "0.00",
    centerTemplates: [],
    coupons: [],
    selectedCouponId: "",
    availableCouponCount: 0,
    pageState: "loading",
    errorMessage: "",
    actionLoadingId: "",
    actionType: ""
  },
  onLoad(options) {
    this.setData({
      mode: options.mode || "manage",
      amount: Number(options.amount || 0),
      displayAmount: Number(options.amount || 0).toFixed(2)
    });
  },
  async onShow() {
    await this.loadCoupons();
  },
  async loadCoupons() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: "",
        actionLoadingId: "",
        actionType: ""
      });

      this.setData(buildCouponViewModel(
        await mallService.getCouponPageData(),
        this.data.mode,
        this.data.amount
      ));
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "优惠券加载失败",
        actionLoadingId: "",
        actionType: ""
      });
    }
  },
  async claimCoupon(event) {
    if (this.data.actionLoadingId || this.data.pageState !== "success") {
      return;
    }

    const { id } = event.currentTarget.dataset;
    let result = null;

    try {
      this.setData({
        actionLoadingId: id,
        actionType: "claim"
      });

      result = await mallService.claimCoupon(id);
    } catch (error) {
      this.setData({
        actionLoadingId: "",
        actionType: ""
      });
      wx.showToast({
        title: error.message || "领取失败",
        icon: "none"
      });
      return;
    }

    if (!result.ok) {
      this.setData({
        actionLoadingId: "",
        actionType: ""
      });
      wx.showToast({
        title: "这张券已经领过了",
        icon: "none"
      });
      return;
    }

    await this.loadCoupons();

    wx.showToast({
      title: "领取成功",
      icon: "success"
    });
  },
  async selectCoupon(event) {
    if (this.data.mode !== "select" || this.data.actionLoadingId || this.data.pageState !== "success") {
      return;
    }

    const { id, selectable, reason } = event.currentTarget.dataset;
    let result = null;

    if (!selectable) {
      wx.showToast({
        title: reason || "这张券当前不可选",
        icon: "none"
      });
      return;
    }

    try {
      this.setData({
        actionLoadingId: id,
        actionType: "select"
      });

      result = await mallService.selectCoupon(id, this.data.amount);
    } catch (error) {
      this.setData({
        actionLoadingId: "",
        actionType: ""
      });
      wx.showToast({
        title: error.message || "优惠券选择失败",
        icon: "none"
      });
      return;
    }

    if (!result.ok) {
      this.setData({
        actionLoadingId: "",
        actionType: ""
      });
      wx.showToast({
        title: result.message,
        icon: "none"
      });
      return;
    }

    wx.showToast({
      title: "优惠券已选择",
      icon: "success"
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 250);
  },
  async clearCoupon() {
    if (this.data.actionLoadingId || this.data.pageState !== "success") {
      return;
    }

    try {
      this.setData({
        actionLoadingId: "clear",
        actionType: "clear"
      });

      await mallService.clearSelectedCoupon();
    } catch (error) {
      this.setData({
        actionLoadingId: "",
        actionType: ""
      });
      wx.showToast({
        title: error.message || "取消优惠券失败",
        icon: "none"
      });
      return;
    }

    wx.showToast({
      title: "已取消使用优惠券",
      icon: "success"
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 250);
  },
  retryLoad() {
    this.loadCoupons();
  },
  backProfile() {
    wx.switchTab({
      url: "/pages/profile/index"
    });
  }
});
