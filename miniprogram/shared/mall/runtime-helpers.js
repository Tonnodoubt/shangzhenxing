function createRuntimeHelpers(deps) {
  const {
    cloneData,
    buildCartView,
    buildCartSummary,
    buildCheckoutSummary,
    resolveSelectedAddress,
    getProductById,
    generateId,
    formatDateTime,
    getStatusText,
    getCommissionRate,
    decorateOrder
  } = deps;

  function getSelectedCouponInternal(state) {
    return (state.coupons || []).find((item) => {
      return item.id === state.selectedCouponId && item.status === "available";
    }) || null;
  }

  function consumeSelectedCoupon(state, orderId) {
    const selectedCouponId = state.selectedCouponId;

    if (!selectedCouponId) {
      return;
    }

    state.coupons = (state.coupons || []).map((item) => {
      if (item.id !== selectedCouponId) {
        return item;
      }

      return {
        ...item,
        status: "used",
        orderId
      };
    });

    state.selectedCouponId = "";
  }

  function restoreUsedCouponForOrder(state, orderId) {
    state.coupons = (state.coupons || []).map((item) => {
      if (item.orderId !== orderId || item.status !== "used") {
        return item;
      }

      return {
        ...item,
        status: "available",
        orderId: ""
      };
    });
  }

  function shouldAutoShipOrder(order) {
    return !!(
      order &&
      order.sourceType === "runtime" &&
      order.status === "pending" &&
      Number(order.autoShipAfter || 0) >= 0 &&
      Date.now() >= Number(order.autoShipAfter || 0)
    );
  }

  function buildCommissionTitle(order = {}) {
    const items = Array.isArray(order.items) ? order.items : [];
    const firstTitle = String(((items[0] || {}).title || "")).trim();

    if (!firstTitle) {
      return "订单成交分佣";
    }

    if (items.length > 1) {
      return `${firstTitle} 等 ${items.length} 件商品`;
    }

    return firstTitle;
  }

  function calculateCommissionableAmount(order = {}) {
    return (order.items || []).reduce((sum, item) => {
      const product = getProductById(item.id);

      if (product && product.distributionEnabled === false) {
        return sum;
      }

      return sum + Number(item.subtotalAmount || 0);
    }, 0);
  }

  function syncDistributionAfterOrderDone(state, order) {
    if (!order || !order.id) {
      return;
    }

    const alreadySynced = (state.commissionRecords || []).some((item) => item.orderNo === order.id);

    if (alreadySynced) {
      return;
    }

    const commissionBase = calculateCommissionableAmount(order);
    const commissionAmount = Number((commissionBase * getCommissionRate(state.distributor || {})).toFixed(2));

    if (commissionAmount <= 0) {
      return;
    }

    const record = {
      id: generateId("cm"),
      title: buildCommissionTitle(order),
      fromUser: String(((state.user || {}).nickname || "微信用户")).trim() || "微信用户",
      orderNo: order.id,
      amount: commissionAmount,
      levelText: "一级佣金",
      status: "pending",
      statusText: "待结算",
      createdAt: formatDateTime()
    };

    state.commissionRecords = [record].concat(state.commissionRecords || []);
    state.distributor = {
      ...(state.distributor || {}),
      totalCommission: Number((Number((state.distributor || {}).totalCommission || 0) + commissionAmount).toFixed(2)),
      pendingCommission: Number((Number((state.distributor || {}).pendingCommission || 0) + commissionAmount).toFixed(2))
    };
  }

  function syncPendingOrderLifecycle(state) {
    for (let i = 0; i < (state.orderRecords || []).length; i++) {
      const item = state.orderRecords[i];

      if (shouldAutoShipOrder(item)) {
        state.orderRecords[i] = decorateOrder(
          {
            ...item,
            status: "shipping",
            statusText: getStatusText("shipping")
          },
          i
        );
      }
    }

    for (let i = 0; i < (state.runtimeOrders || []).length; i++) {
      const item = state.runtimeOrders[i];

      if (shouldAutoShipOrder(item)) {
        state.runtimeOrders[i] = decorateOrder(
          {
            ...item,
            status: "shipping",
            statusText: getStatusText("shipping")
          },
          i
        );
      }
    }
  }

  function findOrderById(state, orderId) {
    return (state.orderRecords || []).find((item) => item.id === orderId) || null;
  }

  function assertUserOrderStatusTransition(currentStatus, nextStatus) {
    if (!nextStatus) {
      const err = new Error("缺少订单状态");
      err.code = "ORDER_STATUS_REQUIRED";
      throw err;
    }

    if (currentStatus === nextStatus) {
      return;
    }

    const allowedTransitions = {
      pending: ["cancelled"],
      shipping: ["done"]
    };
    const allowedList = allowedTransitions[currentStatus] || [];

    if (!allowedList.includes(nextStatus)) {
      const err = new Error("当前订单不能执行这个操作");
      err.code = "ORDER_STATUS_TRANSITION_INVALID";
      throw err;
    }
  }

  function buildCartPageData(state) {
    const source = state.cartItems || [];
    const summary = buildCartSummary(source);

    return {
      cartItems: buildCartView(source),
      totalCount: summary.totalCount,
      totalPrice: summary.totalPrice,
      isEmpty: source.length === 0
    };
  }

  function buildCheckoutPageData(state) {
    const source = state.cartItems || [];
    const selectedCoupon = getSelectedCouponInternal(state);
    const summary = buildCheckoutSummary(source, selectedCoupon);

    return {
      address: resolveSelectedAddress(state).address,
      cartItems: buildCartView(source),
      totalCount: summary.totalCount,
      goodsAmount: summary.goodsAmount,
      discountAmount: summary.discountAmount,
      payableAmount: summary.payableAmount,
      goodsAmountNumber: summary.goodsAmountNumber,
      selectedCoupon: selectedCoupon ? cloneData(selectedCoupon) : null
    };
  }

  function buildCouponPageData(state) {
    return {
      centerTemplates: cloneData(state.couponCenterTemplates || []),
      coupons: cloneData(state.coupons || []),
      selectedCouponId: state.selectedCouponId || ""
    };
  }

  function buildProfileData(state) {
    return {
      user: cloneData(state.user),
      address: resolveSelectedAddress(state).address || {},
      coupons: cloneData(state.coupons || []),
      cartCount: (state.cartItems || []).reduce((sum, item) => sum + item.quantity, 0),
      runtimeOrderCount: (state.runtimeOrders || []).length,
      distributor: cloneData(state.distributor || {})
    };
  }

  function updateOrderCollectionsStatus(state, orderId, nextStatus, options = {}) {
    let targetOrder = null;
    let currentOrder = null;

    syncPendingOrderLifecycle(state);
    currentOrder = findOrderById(state, orderId);

    if (!currentOrder) {
      return null;
    }

    if (!options.skipTransitionCheck) {
      assertUserOrderStatusTransition(currentOrder.status, nextStatus);
    }

    state.orderRecords = (state.orderRecords || []).map((item, index) => {
      if (item.id !== orderId) {
        return item;
      }

      targetOrder = decorateOrder(
        {
          ...item,
          status: nextStatus,
          statusText: getStatusText(nextStatus)
        },
        index
      );

      return targetOrder;
    });

    state.runtimeOrders = (state.runtimeOrders || []).map((item, index) => {
      if (item.id !== orderId) {
        return item;
      }

      return decorateOrder(
        {
          ...item,
          status: nextStatus,
          statusText: getStatusText(nextStatus)
        },
        index
      );
    });

    if (currentOrder.status === "pending" && nextStatus === "cancelled") {
      restoreUsedCouponForOrder(state, orderId);
    }

    if (currentOrder.status === "shipping" && nextStatus === "done" && targetOrder) {
      syncDistributionAfterOrderDone(state, targetOrder);
    }

    return targetOrder ? cloneData(targetOrder) : null;
  }

  return {
    getSelectedCouponInternal,
    consumeSelectedCoupon,
    syncPendingOrderLifecycle,
    findOrderById,
    buildCartPageData,
    buildCheckoutPageData,
    buildCouponPageData,
    buildProfileData,
    updateOrderCollectionsStatus
  };
}

module.exports = createRuntimeHelpers;
