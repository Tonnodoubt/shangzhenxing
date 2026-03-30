const mallService = require("../../services/mall-client");

Page({
  data: {
    orderId: "",
    order: null,
    pageState: "loading",
    errorMessage: ""
  },
  async onLoad(options) {
    const orderId = String((options && options.orderId) || "").trim();

    this.setData({
      orderId
    });

    await this.loadOrder(orderId);
  },
  async loadOrder(orderId = this.data.orderId) {
    if (!orderId) {
      this.setData({
        order: null,
        pageState: "notFound",
        errorMessage: "缺少订单参数"
      });
      return;
    }

    try {
      this.setData({
        order: null,
        pageState: "loading",
        errorMessage: ""
      });

      const order = await mallService.getOrderById(orderId);

      if (!order) {
        this.setData({
          order: null,
          pageState: "notFound",
          errorMessage: "订单不存在"
        });
        return;
      }

      this.setData({
        order,
        pageState: "success",
        errorMessage: ""
      });
    } catch (error) {
      const message = (error && error.message) || "订单加载失败";
      const pageState = message.indexOf("不存在") > -1 ? "notFound" : "error";

      this.setData({
        order: null,
        pageState,
        errorMessage: message
      });
    }
  },
  openOrderDetail() {
    if (!this.data.order || this.data.pageState !== "success") {
      return;
    }

    wx.redirectTo({
      url: `/pages/order-detail/index?id=${this.data.order.id}`
    });
  },
  backHome() {
    wx.switchTab({
      url: "/pages/home/index"
    });
  },
  retryLoad() {
    this.loadOrder();
  },
  viewOrders() {
    wx.redirectTo({
      url: "/pages/orders/index"
    });
  }
});
