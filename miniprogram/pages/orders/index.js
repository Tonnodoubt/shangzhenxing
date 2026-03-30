const mallService = require("../../services/mall-client");

const tabs = [
  { status: "all", label: "全部" },
  { status: "pending", label: "待发货" },
  { status: "shipping", label: "待收货" },
  { status: "done", label: "已完成" }
];

function buildEmptyState(activeStatus, orders = []) {
  const currentTab = tabs.find((item) => item.status === activeStatus);
  const currentLabel = currentTab ? currentTab.label : "当前状态";

  if (!orders.length) {
    return {
      emptyTitle: "你还没有任何订单",
      emptyCopy: "可以先去首页挑商品，把下单链路再完整走一遍。"
    };
  }

  return {
    emptyTitle: `${currentLabel}里暂时没有订单`,
    emptyCopy: "可以切到其他状态看看，或者先回首页继续下单。"
  };
}

function decorateOrdersForList(orders = []) {
  return orders.map((order) => {
    const itemCount = (order.items || []).reduce((sum, item) => {
      return sum + Number(item.quantity || 0);
    }, 0);

    return {
      ...order,
      itemCountText: itemCount ? `共 ${itemCount} 件商品` : "",
      canOpenAftersale: !!(order.aftersaleStatusText || order.canAftersale),
      aftersaleEntryText: order.aftersaleStatusText ? "查看售后" : "申请售后"
    };
  });
}

Page({
  data: {
    tabs,
    activeStatus: "all",
    orders: [],
    filteredOrders: [],
    isEmpty: false,
    emptyTitle: "",
    emptyCopy: "",
    pageState: "loading",
    errorMessage: ""
  },
  onLoad(options) {
    const initialStatus = tabs.some((item) => item.status === ((options && options.status) || ""))
      ? options.status
      : "all";

    this.setData({
      activeStatus: initialStatus
    });
  },
  async onShow() {
    await this.loadOrders();
  },
  async loadOrders() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: ""
      });

      wx.showNavigationBarLoading();
      const orders = await mallService.getAllOrders();

      this.setData(
        {
          orders: decorateOrdersForList(orders),
          pageState: "success",
          errorMessage: ""
        },
        () => {
          this.applyFilter();
        }
      );
    } catch (error) {
      this.setData({
        orders: [],
        filteredOrders: [],
        isEmpty: false,
        emptyTitle: "",
        emptyCopy: "",
        pageState: "error",
        errorMessage: error.message || "订单加载失败"
      });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },
  switchStatus(event) {
    if (this.data.pageState !== "success") {
      return;
    }

    const { status } = event.currentTarget.dataset;

    this.setData(
      {
        activeStatus: status
      },
      () => {
        this.applyFilter();
      }
    );
  },
  applyFilter() {
    const { activeStatus, orders } = this.data;
    const filteredOrders = activeStatus === "all"
      ? orders
      : orders.filter((item) => item.status === activeStatus);
    const emptyState = buildEmptyState(activeStatus, orders);

    this.setData({
      filteredOrders,
      isEmpty: filteredOrders.length === 0,
      emptyTitle: emptyState.emptyTitle,
      emptyCopy: emptyState.emptyCopy
    });
  },
  openOrderDetail(event) {
    const { id } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/order-detail/index?id=${id}`
    });
  },
  openAfterSale(event) {
    const { id } = event.currentTarget.dataset;

    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/aftersale/index?orderId=${id}`
    });
  },
  retryLoad() {
    this.loadOrders();
  },
  goHome() {
    wx.switchTab({
      url: "/pages/home/index"
    });
  }
});
