const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontPrismaOrderModule } = require("../src/repositories/storefront/prisma-order");

function createOrderModule(overrides = {}) {
  return createStorefrontPrismaOrderModule({
    assertUserOrderStatusTransition: (currentStatus, nextStatus) => {
      if (!nextStatus) {
        throw new Error("missing next status");
      }

      return { currentStatus, nextStatus };
    },
    buildCheckoutSummary: (cartItems = [], coupon = null) => {
      const goodsAmountNumber = (cartItems || []).reduce((sum, item) => {
        return sum + Number(item.price || 0) * Number(item.quantity || 0);
      }, 0);
      const discountAmountNumber = coupon && goodsAmountNumber >= Number(coupon.threshold || 0)
        ? Math.min(Number(coupon.amount || 0), goodsAmountNumber)
        : 0;

      return {
        totalCount: (cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        goodsAmountNumber,
        discountAmountNumber,
        payableAmountNumber: Math.max(goodsAmountNumber - discountAmountNumber, 0)
      };
    },
    buildPublicOrderNo: () => "NO20260402001",
    couponHelpers: {
      ensureCouponFeatureData: async () => {},
      getSelectedCouponRecord: async () => null,
      restoreUsedCouponForOrder: async () => null
    },
    createStorefrontError: (message, statusCode, code) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      error.code = code;
      return error;
    },
    distributionHelpers: {
      buildOrderReferralSnapshot: async () => ({
        referralBindingId: null,
        inviterUserId: null,
        sourceScene: "direct",
        commissionBaseAmount: 0,
        commissionRate: 0,
        commissionAmount: 0
      }),
      syncDistributionAfterOrderDone: async () => null
    },
    getCartItems: async () => [],
    getCartRecord: async () => ({
      id: "cart-1"
    }),
    getCurrentUserContext: async () => ({
      prisma: {},
      user: {
        id: "user-1",
        nickname: "阿青"
      }
    }),
    getSelectedAddress: async () => null,
    mapAfterSale: (afterSale = {}) => ({
      id: afterSale.id || "",
      status: afterSale.status || ""
    }),
    mapOrder: (order = {}) => ({
      id: order.orderNo || "",
      status: order.status || "",
      couponTitle: order.couponTitle || ""
    }),
    toNumber: (value) => Number(value || 0),
    ...overrides
  });
}

test("order method rejects submit when cart is empty", async () => {
  let ensuredCoupon = false;
  const orderModule = createOrderModule({
    couponHelpers: {
      ensureCouponFeatureData: async () => {
        ensuredCoupon = true;
      },
      getSelectedCouponRecord: async () => null,
      restoreUsedCouponForOrder: async () => null
    },
    getCurrentUserContext: async () => ({
      prisma: {},
      user: {
        id: "user-1"
      }
    }),
    getCartItems: async () => [],
    getSelectedAddress: async () => ({
      id: "addr-1"
    })
  });

  const result = await orderModule.methods.submitOrder("session-token", {});

  assert.equal(ensuredCoupon, true);
  assert.deepEqual(result, {
    ok: false,
    message: "购物车为空"
  });
});

test("order method submits order with coupon and referral snapshots", async () => {
  let usedCouponUpdate = null;
  let cartSelectionCleared = false;
  let cartItemsCleared = false;
  const selectedCoupon = {
    id: "coupon-1",
    template: {
      title: "满 99 减 20",
      amount: 20,
      threshold: 99
    }
  };
  const currentCartItems = [
    {
      productId: "prod-1",
      skuId: "sku-1",
      title: "坚果礼盒",
      specText: "默认规格",
      price: 60,
      quantity: 2
    }
  ];
  const orderModule = createOrderModule({
    couponHelpers: {
      ensureCouponFeatureData: async () => {},
      getSelectedCouponRecord: async () => selectedCoupon,
      restoreUsedCouponForOrder: async () => null
    },
    distributionHelpers: {
      buildOrderReferralSnapshot: async () => ({
        referralBindingId: "binding-1",
        inviterUserId: "inviter-1",
        sourceScene: "share",
        commissionBaseAmount: 120,
        commissionRate: 0.05,
        commissionAmount: 6
      }),
      syncDistributionAfterOrderDone: async () => null
    },
    getCurrentUserContext: async () => ({
      prisma: {
        $transaction: async (handler) => handler(tx)
      },
      user: {
        id: "user-1",
        nickname: "阿青"
      }
    }),
    getCartItems: async () => currentCartItems,
    getCartRecord: async () => ({
      id: "cart-1"
    }),
    getSelectedAddress: async () => ({
      id: "addr-1"
    }),
    mapOrder: (order = {}) => ({
      id: order.orderNo || "",
      status: order.status || "",
      couponTitle: order.couponTitle || ""
    })
  });
  const createdOrderItems = [];
  const tx = {
    order: {
      create: async ({ data }) => ({
        id: "order-1",
        ...data
      }),
      findUnique: async () => ({
        id: "order-1",
        orderNo: "NO20260402001",
        status: "pending",
        couponTitle: "满 99 减 20"
      })
    },
    orderItem: {
      create: async ({ data }) => {
        createdOrderItems.push(data);
        return data;
      }
    },
    userCoupon: {
      update: async (payload) => {
        usedCouponUpdate = payload;
        return payload;
      }
    },
    cart: {
      update: async () => {
        cartSelectionCleared = true;
      }
    },
    cartItem: {
      deleteMany: async () => {
        cartItemsCleared = true;
      }
    }
  };

  const result = await orderModule.methods.submitOrder("session-token", {
    remark: "请尽快发货"
  });

  assert.deepEqual(result, {
    ok: true,
    order: {
      id: "NO20260402001",
      status: "pending",
      couponTitle: "满 99 减 20"
    }
  });
  assert.equal(createdOrderItems.length, 1);
  assert.equal(createdOrderItems[0].orderId, "order-1");
  assert.equal(usedCouponUpdate.data.status, "used");
  assert.equal(cartSelectionCleared, true);
  assert.equal(cartItemsCleared, true);
});

test("order status update restores coupon when cancelling a pending order", async () => {
  let restoredOrderId = null;
  const orderModule = createOrderModule({
    couponHelpers: {
      ensureCouponFeatureData: async () => {},
      getSelectedCouponRecord: async () => null,
      restoreUsedCouponForOrder: async (_tx, orderId) => {
        restoredOrderId = orderId;
      }
    },
    distributionHelpers: {
      buildOrderReferralSnapshot: async () => null,
      syncDistributionAfterOrderDone: async () => null
    },
    getCurrentUserContext: async () => ({
      prisma: {
        $transaction: async (handler) => handler(tx)
      },
      user: {
        id: "user-1",
        nickname: "阿青"
      }
    }),
    mapOrder: (order = {}) => ({
      id: order.orderNo || "",
      status: order.status || ""
    })
  });
  const tx = {
    order: {
      findFirst: async () => ({
        id: "order-2",
        orderNo: "NO20260402002",
        status: "pending",
        address: null,
        afterSale: null,
        items: []
      }),
      update: async () => ({
        id: "order-2",
        orderNo: "NO20260402002",
        status: "cancelled",
        address: null,
        afterSale: null,
        items: []
      }),
      findUnique: async () => ({
        id: "order-2",
        orderNo: "NO20260402002",
        status: "cancelled",
        address: null,
        afterSale: null,
        items: []
      })
    }
  };

  const result = await orderModule.methods.updateOrderStatus("session-token", "NO20260402002", "cancelled");

  assert.equal(restoredOrderId, "order-2");
  assert.deepEqual(result, {
    id: "NO20260402002",
    status: "cancelled"
  });
});

test("order status update syncs distribution when confirming receipt", async () => {
  let syncedOrderNo = null;
  const orderModule = createOrderModule({
    couponHelpers: {
      ensureCouponFeatureData: async () => {},
      getSelectedCouponRecord: async () => null,
      restoreUsedCouponForOrder: async () => null
    },
    distributionHelpers: {
      buildOrderReferralSnapshot: async () => null,
      syncDistributionAfterOrderDone: async (_tx, _user, order) => {
        syncedOrderNo = order.orderNo;
      }
    },
    getCurrentUserContext: async () => ({
      prisma: {
        $transaction: async (handler) => handler(tx)
      },
      user: {
        id: "user-1",
        nickname: "阿青"
      }
    }),
    mapOrder: (order = {}) => ({
      id: order.orderNo || "",
      status: order.status || ""
    })
  });
  const tx = {
    order: {
      findFirst: async () => ({
        id: "order-3",
        orderNo: "NO20260402003",
        status: "shipping",
        address: null,
        afterSale: null,
        items: []
      }),
      update: async () => ({
        id: "order-3",
        orderNo: "NO20260402003",
        status: "done",
        address: null,
        afterSale: null,
        items: []
      }),
      findUnique: async () => ({
        id: "order-3",
        orderNo: "NO20260402003",
        status: "done",
        address: null,
        afterSale: null,
        items: []
      })
    }
  };

  const result = await orderModule.methods.updateOrderStatus("session-token", "NO20260402003", "done");

  assert.equal(syncedOrderNo, "NO20260402003");
  assert.deepEqual(result, {
    id: "NO20260402003",
    status: "done"
  });
});

test("order method creates aftersale only for eligible orders", async () => {
  const orderModule = createOrderModule({
    mapAfterSale: (afterSale = {}) => ({
      id: afterSale.id || "",
      orderId: afterSale.orderId || "",
      status: afterSale.status || ""
    }),
    getCurrentUserContext: async () => ({
      prisma: {
        afterSale: {
          create: async ({ data }) => ({
            id: "as-1",
            ...data
          })
        },
        order: {
          findFirst: async () => ({
            id: "order-4",
            orderNo: "NO20260402004",
            status: "shipping",
            afterSale: null,
            items: []
          })
        }
      },
      user: {
        id: "user-1"
      }
    })
  });

  const result = await orderModule.methods.createAfterSale({
    sessionToken: "session-token",
    orderId: "NO20260402004",
    reason: "不想要了",
    description: "申请售后"
  });

  assert.deepEqual(result, {
    id: "as-1",
    orderId: "NO20260402004",
    status: "processing"
  });
});
