const mallService = require("../../services/mall-client");

function decorateCouponList(coupons = [], mode = "manage", amount = 0, selectedCouponId = "") {
  return coupons.map((item) => {
    const threshold = Number(item.threshold || 0);
    const isAvailable = item.status === "available";
    const meetsThreshold = Number(amount || 0) >= threshold;
    let selectHint = "";

    if (mode === "select") {
      if (!isAvailable) {
        selectHint = "这张券当前不可用";
      } else if (!meetsThreshold) {
        selectHint = `满 ${threshold} 可用`;
      } else if (selectedCouponId === item.id) {
        selectHint = "当前已选";
      } else {
        selectHint = "点击选择";
      }
    }

    return {
      ...item,
      statusLabel: isAvailable ? "可用" : "已使用",
      selectHint,
      meetsThreshold
    };
  });
}

function buildCouponViewModel(payload = {}, mode = "manage", amount = 0) {
  const selectedCouponId = payload.selectedCouponId || "";

  return {
    centerTemplates: payload.centerTemplates || [],
    coupons: decorateCouponList(payload.coupons || [], mode, amount, selectedCouponId),
    selectedCouponId,
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

    const { id } = event.currentTarget.dataset;
    const { selectable, reason } = event.currentTarget.dataset;
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
