const mallService = require("../../services/mall-client");
const { confirmAction } = require("../../shared/dialog");

function buildOrderItems(order = {}) {
  return (order.items || []).map((item) => {
    return {
      ...item,
      priceText: `¥${item.subtotal || order.displayAmount || "0.00"}`
    };
  });
}

function buildAmountRows(order = {}) {
  const rows = [
    {
      id: "goods",
      label: "商品金额",
      value: `¥${order.goodsAmount || order.displayAmount || "0.00"}`
    },
    {
      id: "discount",
      label: "优惠金额",
      value: `-¥${order.discountAmount || "0.00"}`
    }
  ];

  if (order.couponTitle) {
    rows.push({
      id: "coupon",
      label: "优惠券",
      value: order.couponTitle
    });
  }

  rows.push({
    id: "payable",
    label: "实付金额",
    value: `¥${order.displayAmount || "0.00"}`,
    isTotal: true
  });

  return rows;
}

function buildProcessSteps(order = {}, afterSale = null) {
  const status = order.status || "";
  const shippedActive = status === "shipping" || status === "done";
  const finishedActive = status === "done" || status === "cancelled";
  let secondTitle = "等待发货";
  let secondCopy = "商家确认订单后会进入发货流程。";
  let thirdTitle = "订单完成";
  let thirdCopy = "确认收货后订单会进入已完成。";

  if (status === "shipping") {
    secondTitle = "商家已发货";
    secondCopy = "商品配送中，确认收货后订单会完成。";
  } else if (status === "done") {
    secondTitle = "商家已发货";
    secondCopy = "商品已配送完成，本次履约已结束。";
    thirdCopy = afterSale && afterSale.statusText
      ? `售后状态：${afterSale.statusText}`
      : "订单已完成，可继续查看售后或再次下单。";
  } else if (status === "cancelled") {
    secondTitle = "订单未继续履约";
    secondCopy = "这笔订单已取消，未进入发货流程。";
    thirdTitle = "订单已取消";
    thirdCopy = "如需购买同类商品，可以重新下单。";
  }

  return [
    {
      id: "create",
      title: "提交订单",
      copy: order.createTime ? `下单时间 ${order.createTime}` : "订单已创建",
      active: true
    },
    {
      id: "shipping",
      title: secondTitle,
      copy: secondCopy,
      active: shippedActive
    },
    {
      id: "finish",
      title: thirdTitle,
      copy: thirdCopy,
      active: finishedActive
    }
  ];
}

function buildServiceTips(order = {}, afterSale = null) {
  const tips = [];

  if (order.canCancel) {
    tips.push({
      id: "cancel",
      title: "当前支持取消订单",
      copy: "待发货订单可以直接在本页取消，避免误下单。"
    });
  }

  if (order.canConfirm) {
    tips.push({
      id: "confirm",
      title: "当前支持确认收货",
      copy: "确认收货后订单会进入已完成，售后入口也会继续保留。"
    });
  }

  if (afterSale || order.aftersaleStatusText) {
    tips.push({
      id: "aftersale-record",
      title: "这笔订单已有售后记录",
      copy: "可以直接进入售后页查看当前处理状态和提交原因。"
    });
  } else if (order.canAftersale) {
    tips.push({
      id: "aftersale",
      title: "当前支持申请售后",
      copy: "待收货和已完成订单可发起售后，提交后可在订单内跟踪进度。"
    });
  }

  if (order.couponTitle) {
    tips.push({
      id: "coupon",
      title: "本单已使用优惠券",
      copy: `本单优惠来自 ${order.couponTitle}，金额明细已展示在上方。`
    });
  }

  if (!tips.length) {
    tips.push({
      id: "service",
      title: "当前订单已进入稳定状态",
      copy: "可继续查看金额、地址、商品和服务信息。"
    });
  }

  return tips;
}

function buildOrderViewModel(detail = {}) {
  const sourceOrder = detail.order || null;
  const afterSale = detail.afterSale || null;

  if (!sourceOrder) {
    return {
      order: null,
      afterSale: null
    };
  }

  const itemCount = (sourceOrder.items || []).reduce((sum, item) => {
    return sum + Number(item.quantity || 0);
  }, 0);
  const order = {
    ...sourceOrder,
    itemCountText: itemCount ? `共 ${itemCount} 件商品` : "订单商品信息",
    addressLine: sourceOrder.address ? `${sourceOrder.address.receiver} ${sourceOrder.address.phone}` : "",
    itemList: buildOrderItems(sourceOrder),
    amountRows: buildAmountRows(sourceOrder),
    processSteps: buildProcessSteps(sourceOrder, afterSale),
    serviceTips: buildServiceTips(sourceOrder, afterSale),
    statusSummary: afterSale && afterSale.statusText
      ? `订单状态 ${sourceOrder.statusText}，售后当前为 ${afterSale.statusText}。`
      : (sourceOrder.canConfirm
        ? "商品已经发出，确认收货后订单会进入已完成。"
        : (sourceOrder.canCancel
          ? "订单已创建，当前还可以直接取消。"
          : "你可以在这里查看金额、地址、商品和售后信息。")),
    canOpenAftersale: !!(afterSale || sourceOrder.aftersaleStatusText || sourceOrder.canAftersale),
    aftersaleButtonText: afterSale || sourceOrder.aftersaleStatusText ? "查看售后" : "申请售后"
  };

  return {
    order,
    afterSale
  };
}

Page({
  data: {
    orderId: "",
    order: null,
    afterSale: null,
    pageState: "loading",
    errorMessage: "",
    actionLoading: "",
    loadedOnce: false
  },
  async onLoad(options) {
    const orderId = String((options && options.id) || "").trim();

    this.setData({
      orderId
    });

    await this.loadOrder(orderId);
  },
  async onShow() {
    if (this.data.loadedOnce && this.data.orderId) {
      await this.loadOrder(this.data.orderId);
    }
  },
  async loadOrder(orderId = this.data.orderId) {
    if (!orderId) {
      this.setData({
        order: null,
        afterSale: null,
        pageState: "notFound",
        errorMessage: "缺少订单参数",
        actionLoading: ""
      });
      return;
    }

    try {
      this.setData({
        order: null,
        afterSale: null,
        pageState: "loading",
        errorMessage: "",
        actionLoading: ""
      });

      const detail = await mallService.getOrderDetailData(orderId);

      if (!detail || !detail.order) {
        this.setData({
          order: null,
          afterSale: null,
          pageState: "notFound",
          errorMessage: "订单不存在",
          actionLoading: "",
          loadedOnce: true
        });
        return;
      }

      const viewModel = buildOrderViewModel(detail);

      this.setData({
        order: viewModel.order,
        afterSale: viewModel.afterSale,
        pageState: "success",
        errorMessage: "",
        actionLoading: "",
        loadedOnce: true
      });
    } catch (error) {
      const message = (error && error.message) || "订单详情加载失败";
      const pageState = message.indexOf("不存在") > -1 ? "notFound" : "error";

      this.setData({
        order: null,
        afterSale: null,
        pageState,
        errorMessage: message,
        actionLoading: "",
        loadedOnce: true
      });
    }
  },
  async cancelOrder() {
    if (!this.data.order || this.data.actionLoading) {
      return;
    }

    const confirmed = await confirmAction({
      title: "取消订单",
      content: "确认要取消这个订单吗？取消后需要重新下单。",
      confirmText: "确认取消"
    });

    if (!confirmed) {
      return;
    }

    this.setData({
      actionLoading: "cancel"
    });

    let order = null;

    try {
      order = await mallService.updateOrderStatus(this.data.order.id, "cancelled");
    } catch (error) {
      this.setData({
        actionLoading: ""
      });
      wx.showToast({
        title: error.message || "取消订单失败",
        icon: "none"
      });
      return;
    }

    if (!order) {
      this.setData({
        order: null,
        afterSale: null,
        pageState: "notFound",
        errorMessage: "订单不存在",
        actionLoading: ""
      });
      return;
    }

    this.setData({
      ...buildOrderViewModel({
        order,
        afterSale: this.data.afterSale
      }),
      actionLoading: ""
    });

    wx.showToast({
      title: "订单已取消",
      icon: "success"
    });
  },
  async confirmReceipt() {
    if (!this.data.order || this.data.actionLoading) {
      return;
    }

    const confirmed = await confirmAction({
      title: "确认收货",
      content: "确认已经收到商品了吗？确认后订单会进入已完成。",
      confirmText: "确认收货"
    });

    if (!confirmed) {
      return;
    }

    this.setData({
      actionLoading: "confirm"
    });

    let order = null;

    try {
      order = await mallService.updateOrderStatus(this.data.order.id, "done");
    } catch (error) {
      this.setData({
        actionLoading: ""
      });
      wx.showToast({
        title: error.message || "确认收货失败",
        icon: "none"
      });
      return;
    }

    if (!order) {
      this.setData({
        order: null,
        afterSale: null,
        pageState: "notFound",
        errorMessage: "订单不存在",
        actionLoading: ""
      });
      return;
    }

    this.setData({
      ...buildOrderViewModel({
        order,
        afterSale: this.data.afterSale
      }),
      actionLoading: ""
    });

    wx.showToast({
      title: "已确认收货",
      icon: "success"
    });
  },
  openAfterSale() {
    if (!this.data.order || this.data.actionLoading) {
      return;
    }

    wx.navigateTo({
      url: `/pages/aftersale/index?orderId=${this.data.order.id}`
    });
  },
  retryLoad() {
    this.loadOrder();
  },
  backOrders() {
    wx.redirectTo({
      url: "/pages/orders/index"
    });
  },
  backHome() {
    wx.switchTab({
      url: "/pages/home/index"
    });
  }
});
