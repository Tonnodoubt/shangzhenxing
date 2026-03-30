const mallService = require("../../services/mall-client");

const reasons = ["不想要了", "商品有瑕疵", "发错规格", "物流问题"];

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

function buildProcessSteps(afterSale = null) {
  const status = (afterSale && afterSale.status) || "processing";
  const resultActive = status === "approved" || status === "rejected" || status === "done";

  return [
    {
      id: "submit",
      title: "提交申请",
      copy: "选择售后原因并补充说明",
      active: true
    },
    {
      id: "processing",
      title: "平台处理中",
      copy: "客服会结合订单状态和申请原因进行处理",
      active: true
    },
    {
      id: "result",
      title: "结果回到订单详情",
      copy: afterSale && afterSale.statusText ? afterSale.statusText : "当前版本会在订单详情展示处理状态",
      active: resultActive
    }
  ];
}

function buildSupportTips() {
  return [
    {
      id: "status",
      title: "支持状态",
      copy: "待收货和已完成订单可发起售后。"
    },
    {
      id: "repeat",
      title: "重复保护",
      copy: "同一订单提交后会进入处理中，页面会阻止重复申请。"
    },
    {
      id: "result",
      title: "进度查看",
      copy: "提交后可以回订单详情查看售后状态和处理时间。"
    }
  ];
}

function decorateOrder(order = {}) {
  const itemCount = (order.items || []).reduce((sum, item) => {
    return sum + Number(item.quantity || 0);
  }, 0);

  return {
    ...order,
    itemCountText: itemCount ? `共 ${itemCount} 件商品` : "订单商品信息",
    itemList: buildOrderItems(order),
    amountRows: buildAmountRows(order),
    addressLine: order.address ? `${order.address.receiver} ${order.address.phone}` : ""
  };
}

function buildAftersaleViewModel(detail = {}) {
  const order = detail.order ? decorateOrder(detail.order) : null;
  const afterSale = detail.afterSale || null;
  const processSteps = buildProcessSteps(afterSale);
  const supportTips = buildSupportTips();

  if (!order) {
    return {
      order: null,
      afterSale: null,
      processSteps,
      supportTips,
      pageState: "notFound",
      errorMessage: "订单不存在",
      submitButtonText: "提交售后申请",
      canSubmit: false
    };
  }

  if (afterSale || order.aftersaleStatus) {
    return {
      order,
      afterSale,
      processSteps,
      supportTips,
      pageState: "submitted",
      errorMessage: "",
      submitButtonText: "该订单已提交售后",
      canSubmit: false
    };
  }

  if (!order.canAftersale) {
    return {
      order,
      afterSale: null,
      processSteps,
      supportTips,
      pageState: "notEligible",
      errorMessage: "",
      submitButtonText: "当前订单暂不可售后",
      canSubmit: false
    };
  }

  return {
    order,
    afterSale: null,
    processSteps,
    supportTips,
    pageState: "success",
    errorMessage: "",
    submitButtonText: "提交售后申请",
    canSubmit: true
  };
}

Page({
  data: {
    orderId: "",
    order: null,
    afterSale: null,
    reasons,
    selectedReason: "不想要了",
    description: "",
    processSteps: buildProcessSteps(),
    supportTips: buildSupportTips(),
    pageState: "loading",
    errorMessage: "",
    submitting: false,
    submitButtonText: "提交售后申请",
    canSubmit: false
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
        afterSale: null,
        selectedReason: reasons[0],
        description: "",
        processSteps: buildProcessSteps(),
        supportTips: buildSupportTips(),
        pageState: "notFound",
        errorMessage: "缺少订单参数",
        submitting: false,
        submitButtonText: "提交售后申请",
        canSubmit: false
      });
      return;
    }

    try {
      this.setData({
        order: null,
        afterSale: null,
        pageState: "loading",
        errorMessage: "",
        selectedReason: reasons[0],
        description: "",
        processSteps: buildProcessSteps(),
        supportTips: buildSupportTips(),
        submitting: false,
        submitButtonText: "提交售后申请",
        canSubmit: false
      });

      this.setData(buildAftersaleViewModel(await mallService.getOrderDetailData(orderId)));
    } catch (error) {
      const message = (error && error.message) || "订单加载失败";
      const pageState = message.indexOf("不存在") > -1 ? "notFound" : "error";

      this.setData({
        order: null,
        afterSale: null,
        selectedReason: reasons[0],
        description: "",
        processSteps: buildProcessSteps(),
        supportTips: buildSupportTips(),
        pageState,
        errorMessage: message,
        submitting: false,
        submitButtonText: "提交售后申请",
        canSubmit: false
      });
    }
  },
  chooseReason(event) {
    if (this.data.submitting || this.data.pageState !== "success") {
      return;
    }

    const { reason } = event.currentTarget.dataset;

    this.setData({
      selectedReason: reason
    });
  },
  handleInput(event) {
    if (this.data.submitting || this.data.pageState !== "success") {
      return;
    }

    this.setData({
      description: event.detail.value
    });
  },
  async submitAfterSale() {
    if (this.data.submitting) {
      return;
    }

    if (!this.data.order || !this.data.canSubmit || this.data.pageState !== "success") {
      wx.showToast({
        title: "当前订单暂时不能提交售后",
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: true
    });

    let afterSale = null;

    try {
      afterSale = await mallService.createAfterSale({
        orderId: this.data.order.id,
        reason: this.data.selectedReason,
        description: String(this.data.description || "").trim()
      });
    } catch (error) {
      this.setData({
        submitting: false
      });
      wx.showToast({
        title: error.message || "售后提交失败",
        icon: "none"
      });
      return;
    }

    this.setData({
      afterSale,
      pageState: "submitted",
      canSubmit: false,
      processSteps: buildProcessSteps(afterSale),
      submitting: false,
      submitButtonText: "该订单已提交售后",
      order: {
        ...this.data.order,
        aftersaleStatus: "processing",
        aftersaleStatusText: "售后处理中"
      }
    });

    wx.showToast({
      title: "售后申请已提交",
      icon: "success"
    });

    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/order-detail/index?id=${this.data.order.id}`
      });
    }, 300);
  },
  retryLoad() {
    this.loadOrder();
  },
  backOrderDetail() {
    if (this.data.orderId) {
      wx.redirectTo({
        url: `/pages/order-detail/index?id=${this.data.orderId}`
      });
      return;
    }

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
