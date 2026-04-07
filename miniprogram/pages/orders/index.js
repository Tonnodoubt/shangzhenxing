const mallService = require("../../services/mall-client");
const ORDER_PAGE_SIZE = 20;

const tabs = [
  { status: "all", label: "全部" },
  { status: "pending", label: "待发货" },
  { status: "shipping", label: "待收货" },
  { status: "done", label: "已完成" }
];

function buildEmptyState(activeStatus, total = 0) {
  const currentTab = tabs.find((item) => item.status === activeStatus);
  const currentLabel = currentTab ? currentTab.label : "当前状态";

  if (Number(total || 0) <= 0 && activeStatus === "all") {
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
    totalOrders: 0,
    orderPage: 0,
    orderPageSize: ORDER_PAGE_SIZE,
    hasMore: false,
    loadingMore: false,
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
    await this.loadOrders({
      reset: true
    });
  },
  async loadOrders(options = {}) {
    const reset = options.reset !== false;
    const nextPage = reset ? 1 : this.data.orderPage + 1;

    if (!reset && (this.data.loadingMore || !this.data.hasMore || this.data.pageState !== "success")) {
      return;
    }

    try {
      if (reset) {
        this.setData({
          pageState: "loading",
          errorMessage: "",
          loadingMore: false
        });
      } else {
        this.setData({
          loadingMore: true
        });
      }

      wx.showNavigationBarLoading();
      const pageData = await mallService.getAllOrders({
        status: this.data.activeStatus,
        page: nextPage,
        pageSize: this.data.orderPageSize
      });
      const nextOrders = decorateOrdersForList(pageData.list || []);
      const orders = reset ? nextOrders : this.data.orders.concat(nextOrders);
      const totalOrders = Number(pageData.total || 0);
      const hasMore = orders.length < totalOrders;
      const emptyState = buildEmptyState(this.data.activeStatus, totalOrders);

      this.setData({
        orders,
        totalOrders,
        orderPage: Number(pageData.page || nextPage),
        hasMore,
        loadingMore: false,
        isEmpty: orders.length === 0,
        emptyTitle: emptyState.emptyTitle,
        emptyCopy: emptyState.emptyCopy,
        pageState: "success",
        errorMessage: ""
      });
    } catch (error) {
      if (!reset) {
        this.setData({
          loadingMore: false
        });
        wx.showToast({
          title: error.message || "加载更多失败",
          icon: "none"
        });
        return;
      }

      this.setData({
        orders: [],
        totalOrders: 0,
        orderPage: 0,
        hasMore: false,
        loadingMore: false,
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
    if (this.data.loadingMore) {
      return;
    }

    const { status } = event.currentTarget.dataset;

    if (!status || status === this.data.activeStatus) {
      return;
    }

    this.setData({
      activeStatus: status
    });

    this.loadOrders({
      reset: true
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
    this.loadOrders({
      reset: true
    });
  },
  loadMore() {
    this.loadOrders({
      reset: false
    });
  },
  onReachBottom() {
    this.loadMore();
  },
  goHome() {
    wx.switchTab({
      url: "/pages/home/index"
    });
  }
});
