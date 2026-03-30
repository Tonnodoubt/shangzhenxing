const mallService = require("../../services/mall-client");

function buildCheckoutViewModel(payload = {}) {
  const cartItems = payload.cartItems || [];
  const address = payload.address || null;
  const selectedCoupon = payload.selectedCoupon || null;
  const pageState = cartItems.length ? "success" : "empty";
  const missingAddress = pageState === "success" && !address;

  return {
    ...payload,
    address,
    cartItems,
    selectedCoupon,
    pageState,
    errorMessage: "",
    missingAddress,
    submitButtonText: missingAddress ? "请先选择地址" : "提交订单",
    couponActionText: pageState !== "success"
      ? "暂无可选优惠券"
      : selectedCoupon
        ? selectedCoupon.title
        : "选择优惠券",
    couponHintText: selectedCoupon
      ? `已抵扣 ¥${payload.discountAmount || "0.00"}`
      : pageState !== "success"
        ? "先回购物车加商品，再回来结算。"
        : "当前未使用优惠券"
  };
}

Page({
  data: {
    address: null,
    cartItems: [],
    totalCount: 0,
    goodsAmount: "0.00",
    discountAmount: "0.00",
    payableAmount: "0.00",
    goodsAmountNumber: 0,
    selectedCoupon: null,
    remark: "",
    submitting: false,
    pageState: "loading",
    errorMessage: "",
    missingAddress: false,
    submitButtonText: "提交订单",
    couponActionText: "选择优惠券",
    couponHintText: ""
  },
  async onShow() {
    await this.loadCheckoutData();
  },
  async loadCheckoutData() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: "",
        missingAddress: false
      });

      this.setData(buildCheckoutViewModel(await mallService.getCheckoutPageData()));
    } catch (error) {
      this.setData({
        address: null,
        cartItems: [],
        totalCount: 0,
        goodsAmount: "0.00",
        discountAmount: "0.00",
        payableAmount: "0.00",
        goodsAmountNumber: 0,
        selectedCoupon: null,
        pageState: "error",
        errorMessage: error.message || "结算信息加载失败",
        missingAddress: false,
        submitButtonText: "提交订单",
        couponActionText: "暂无可选优惠券",
        couponHintText: ""
      });
    }
  },
  handleRemarkInput(event) {
    this.setData({
      remark: event.detail.value
    });
  },
  chooseAddress() {
    if (this.data.submitting || this.data.pageState === "loading") {
      return;
    }

    wx.navigateTo({
      url: "/pages/address-list/index?mode=select"
    });
  },
  chooseCoupon() {
    if (this.data.pageState !== "success") {
      wx.showToast({
        title: "先加商品再选券",
        icon: "none"
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/coupons/index?mode=select&amount=${this.data.goodsAmountNumber}`
    });
  },
  async submitOrder() {
    if (this.data.submitting) {
      return;
    }

    if (this.data.pageState !== "success") {
      wx.showToast({
        title: "先加商品再提交订单",
        icon: "none"
      });
      return;
    }

    if (this.data.missingAddress) {
      wx.showToast({
        title: "请先选择地址",
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: true
    });

    let result = null;

    try {
      result = await mallService.submitOrder({
        remark: this.data.remark
      });
    } catch (error) {
      this.setData({
        submitting: false
      });
      wx.showToast({
        title: error.message || "提交订单失败",
        icon: "none"
      });
      return;
    }

    if (!result.ok) {
      this.setData({
        submitting: false
      });

      if (result.message === "购物车为空" || result.message === "请先选择地址") {
        await this.loadCheckoutData();
      }

      wx.showToast({
        title: result.message,
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: false
    });

    wx.showToast({
      title: "订单已创建",
      icon: "success"
    });

    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/pay-result/index?orderId=${result.order.id}`
      });
    }, 500);
  },
  retryLoad() {
    this.loadCheckoutData();
  },
  backCart() {
    wx.switchTab({
      url: "/pages/cart/index"
    });
  },
  goShopping() {
    wx.switchTab({
      url: "/pages/home/index"
    });
  }
});
