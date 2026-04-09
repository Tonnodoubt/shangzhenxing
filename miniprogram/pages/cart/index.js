const mallService = require("../../services/mall-client");

const MAX_QUANTITY = 99;

function hasFiniteStock(value) {
  return value !== "" && value !== null && typeof value !== "undefined" && Number.isFinite(Number(value));
}

function normalizeCartItem(item = {}) {
  const availableStock = hasFiniteStock(item.availableStock)
    ? Math.max(0, Number(item.availableStock))
    : null;
  const maxQuantity = hasFiniteStock(availableStock)
    ? Math.max(0, Math.min(MAX_QUANTITY, availableStock))
    : MAX_QUANTITY;
  const canIncrease = maxQuantity > 0 && Number(item.quantity || 0) < maxQuantity;
  let stockHint = "";

  if (hasFiniteStock(availableStock)) {
    stockHint = availableStock > 0 ? `库存仅剩 ${availableStock} 件` : "当前规格已售罄";
  }

  return {
    ...item,
    availableStock,
    maxQuantity,
    canIncrease,
    stockHint
  };
}

function buildCartViewModel(payload = {}) {
  const cartItems = (payload.cartItems || []).map((item) => normalizeCartItem(item));

  return {
    ...payload,
    cartItems,
    totalCount: Number(payload.totalCount || 0),
    totalPrice: payload.totalPrice || "0.00",
    isEmpty: typeof payload.isEmpty === "boolean" ? payload.isEmpty : cartItems.length === 0,
    pageState: "success",
    errorMessage: ""
  };
}

function confirmAction(options = {}) {
  return new Promise((resolve) => {
    wx.showModal({
      title: options.title || "请确认",
      content: options.content || "",
      confirmText: options.confirmText || "确定",
      cancelText: options.cancelText || "取消",
      success(result) {
        resolve(!!result.confirm);
      },
      fail() {
        resolve(false);
      }
    });
  });
}

Page({
  data: {
    cartItems: [],
    totalCount: 0,
    totalPrice: "0.00",
    isEmpty: true,
    pageState: "loading",
    errorMessage: "",
    refreshing: false,
    loadingCartKey: "",
    loadingAction: ""
  },
  async onShow() {
    await this.loadCart();
  },
  async loadCart() {
    try {
      this.setData({
        refreshing: true,
        errorMessage: "",
        ...(this.data.pageState === "success" ? {} : { pageState: "loading" })
      });

      this.setData({
        ...buildCartViewModel(await mallService.getCartPageData()),
        refreshing: false,
        loadingCartKey: "",
        loadingAction: ""
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "购物车加载失败",
        refreshing: false,
        loadingCartKey: "",
        loadingAction: ""
      });
    }
  },
  async increaseQuantity(event) {
    if (this.data.pageState !== "success" || this.data.loadingCartKey || this.data.refreshing) {
      return;
    }

    const { id, spec, canIncrease, maxQuantity } = event.currentTarget.dataset;
    const cartKey = event.currentTarget.dataset.key;

    if (canIncrease === false || canIncrease === "false") {
      const numericMaxQuantity = Number(maxQuantity || 0);
      wx.showToast({
        title: numericMaxQuantity > 0 ? `当前最多购买 ${numericMaxQuantity} 件` : "当前规格已售罄",
        icon: "none"
      });
      return;
    }

    try {
      this.setData({
        loadingCartKey: cartKey,
        loadingAction: "increase"
      });

      this.setData({
        ...buildCartViewModel(await mallService.increaseCartItem(id, spec)),
        loadingCartKey: "",
        loadingAction: ""
      });
    } catch (error) {
      this.setData({
        loadingCartKey: "",
        loadingAction: ""
      });
      wx.showToast({
        title: error.message || "数量更新失败",
        icon: "none"
      });
    }
  },
  async decreaseQuantity(event) {
    if (this.data.pageState !== "success" || this.data.loadingCartKey || this.data.refreshing) {
      return;
    }

    const { id, spec } = event.currentTarget.dataset;
    const cartKey = event.currentTarget.dataset.key;

    try {
      this.setData({
        loadingCartKey: cartKey,
        loadingAction: "decrease"
      });

      this.setData({
        ...buildCartViewModel(await mallService.decreaseCartItem(id, spec)),
        loadingCartKey: "",
        loadingAction: ""
      });
    } catch (error) {
      this.setData({
        loadingCartKey: "",
        loadingAction: ""
      });
      wx.showToast({
        title: error.message || "数量更新失败",
        icon: "none"
      });
    }
  },
  async removeItem(event) {
    if (this.data.pageState !== "success" || this.data.loadingCartKey || this.data.refreshing) {
      return;
    }

    const { id, spec } = event.currentTarget.dataset;
    const cartKey = event.currentTarget.dataset.key;
    const confirmed = await confirmAction({
      title: "删除商品",
      content: "确认把这件商品从购物车移除吗？",
      confirmText: "确认删除"
    });

    if (!confirmed) {
      return;
    }

    try {
      this.setData({
        loadingCartKey: cartKey,
        loadingAction: "remove"
      });

      this.setData({
        ...buildCartViewModel(await mallService.removeCartItem(id, spec)),
        loadingCartKey: "",
        loadingAction: ""
      });
    } catch (error) {
      this.setData({
        loadingCartKey: "",
        loadingAction: ""
      });
      wx.showToast({
        title: error.message || "商品移除失败",
        icon: "none"
      });
    }
  },
  goCheckout() {
    if (this.data.refreshing || this.data.loadingCartKey) {
      return;
    }

    if (this.data.isEmpty) {
      wx.showToast({
        title: "购物车还是空的",
        icon: "none"
      });
      return;
    }

    wx.navigateTo({
      url: "/pages/checkout/index"
    });
  },
  goShopping() {
    wx.switchTab({
      url: "/pages/home/index"
    });
  },
  retryLoad() {
    this.loadCart();
  }
});
