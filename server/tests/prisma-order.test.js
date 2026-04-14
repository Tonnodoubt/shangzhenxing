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
    buildPaginatedResult: (list, total, options = {}) => ({
      list,
      page: Number(options.page || 1),
      pageSize: Number(options.pageSize || list.length || 20),
      total
    }),
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
        levelTwoInviterUserId: null,
        ruleVersionId: null,
        sourceScene: "direct",
        commissionBaseAmount: 0,
        commissionRate: 0,
        commissionAmount: 0,
        levelTwoCommissionRate: 0,
        levelTwoCommissionAmount: 0
      }),
      syncDistributionAfterOrderDone: async () => null
    },
    formatDateTime: (value) => {
      if (!value) {
        return "";
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return date.toISOString();
    },
    getPaginationQuery: (options = {}) => {
      const page = Math.max(1, Number(options.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 20)));

      return {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize
      };
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
  let createdOrderPayload = null;
  const decrementedSkuIds = [];
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
        levelTwoInviterUserId: "inviter-2",
        ruleVersionId: "drv-1",
        sourceScene: "share",
        commissionBaseAmount: 120,
        commissionRate: 0.05,
        commissionAmount: 6,
        levelTwoCommissionRate: 0.02,
        levelTwoCommissionAmount: 2.4
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
      create: async ({ data }) => {
        createdOrderPayload = data;
        return {
        id: "order-1",
        ...data
        };
      },
      findUnique: async () => ({
        id: "order-1",
        orderNo: "NO20260402001",
        status: "pending",
        couponTitle: "满 99 减 20"
      })
    },
    productSku: {
      update: async ({ where, data }) => {
        decrementedSkuIds.push(where.id);
        return data;
      }
    },
    orderItem: {
      createMany: async ({ data }) => {
        createdOrderItems.push(...(data || []));
        return {
          count: (data || []).length
        };
      }
    },
    product: {
      findUnique: async () => ({
        id: "prod-1",
        title: "坚果礼盒",
        status: "on_sale",
        price: 60,
        skus: [
          {
            id: "sku-1",
            specText: "默认规格",
            price: 60,
            stock: 20,
            lockStock: 0,
            status: "enabled"
          }
        ]
      }),
      update: async ({ data }) => data
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
  assert.equal(createdOrderItems[0].skuId, "sku-1");
  assert.equal(createdOrderPayload.ruleVersionId, "drv-1");
  assert.equal(createdOrderPayload.levelTwoInviterUserId, "inviter-2");
  assert.equal(createdOrderPayload.levelTwoCommissionRate, 0.02);
  assert.equal(createdOrderPayload.levelTwoCommissionAmount, 2.4);
  assert.deepEqual(decrementedSkuIds, ["sku-1"]);
  assert.equal(usedCouponUpdate.data.status, "used");
  assert.equal(cartSelectionCleared, true);
  assert.equal(cartItemsCleared, true);
});

test("order status update restores coupon when cancelling a pending order", async () => {
  let restoredOrderId = null;
  const restoredSkuIds = [];
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
        items: [
          {
            skuId: "sku-9",
            quantity: 2
          }
        ]
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
    },
    productSku: {
      update: async ({ where }) => {
        restoredSkuIds.push(where.id);
      }
    }
  };

  const result = await orderModule.methods.updateOrderStatus("session-token", "NO20260402002", "cancelled");

  assert.equal(restoredOrderId, "order-2");
  assert.deepEqual(restoredSkuIds, ["sku-9"]);
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

test("order method paginates orders by status", async () => {
  let findManyPayload = null;
  let countPayload = null;
  const orderModule = createOrderModule({
    getCurrentUserContext: async () => ({
      prisma: {
        order: {
          findMany: async (payload) => {
            findManyPayload = payload;
            return [
              {
                orderNo: "NO20260402005",
                status: "shipping",
                address: null,
                afterSale: null,
                items: []
              }
            ];
          },
          count: async (payload) => {
            countPayload = payload;
            return 3;
          }
        }
      },
      user: {
        id: "user-1"
      }
    }),
    mapOrder: (order = {}) => ({
      id: order.orderNo || "",
      status: order.status || ""
    })
  });

  const result = await orderModule.methods.getAllOrders("session-token", {
    status: "shipping",
    page: 2,
    pageSize: 1
  });

  assert.deepEqual(findManyPayload.where, {
    userId: "user-1",
    status: "shipping"
  });
  assert.equal(findManyPayload.skip, 1);
  assert.equal(findManyPayload.take, 1);
  assert.deepEqual(countPayload, {
    where: {
      userId: "user-1",
      status: "shipping"
    }
  });
  assert.deepEqual(result, {
    list: [
      {
        id: "NO20260402005",
        status: "shipping"
      }
    ],
    page: 2,
    pageSize: 1,
    total: 3
  });
});

test("order payment prepare creates mock payment payload", async () => {
  let createdPaymentPayload = null;
  const orderModule = createOrderModule({
    getCurrentUserContext: async () => ({
      prisma: {
        $transaction: async (handler) => handler(tx)
      },
      user: {
        id: "user-1"
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
        id: "order-pay-1",
        orderNo: "NO20260402088",
        userId: "user-1",
        status: "pending",
        payableAmount: 88,
        address: null,
        afterSale: null,
        items: []
      })
    },
    paymentOrder: {
      findUnique: async () => null,
      create: async ({ data }) => {
        createdPaymentPayload = data;
        return {
          id: "pay-1",
          ...data
        };
      }
    }
  };

  const result = await orderModule.methods.prepareOrderPayment("session-token", "NO20260402088", {
    scene: "checkout"
  });

  assert.equal(createdPaymentPayload.orderId, "order-pay-1");
  assert.equal(createdPaymentPayload.provider, "mock");
  assert.equal(createdPaymentPayload.status, "prepared");
  assert.equal(createdPaymentPayload.amount, 88);
  assert.equal(result.orderId, "NO20260402088");
  assert.equal(result.mockFlow, true);
  assert.equal(result.status, "prepared");
  assert.equal(result.order.id, "NO20260402088");
});

test("order payment mock confirm updates payment status to paid", async () => {
  let updatedPaymentPayload = null;
  const orderModule = createOrderModule({
    getCurrentUserContext: async () => ({
      prisma: {
        $transaction: async (handler) => handler(tx)
      },
      user: {
        id: "user-1"
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
        id: "order-pay-2",
        orderNo: "NO20260402099",
        userId: "user-1",
        status: "pending",
        payableAmount: 99,
        address: null,
        afterSale: null,
        items: []
      })
    },
    paymentOrder: {
      findUnique: async () => ({
        id: "pay-2",
        orderId: "order-pay-2",
        orderNo: "NO20260402099",
        userId: "user-1",
        provider: "mock",
        status: "prepared",
        amount: 99,
        currency: "CNY",
        paymentNo: "MP20260402099",
        mockToken: "mock_token_001",
        preparedAt: new Date("2026-04-02T10:00:00Z"),
        paidAt: null,
        expiresAt: new Date("2026-04-02T10:15:00Z")
      }),
      update: async ({ data }) => {
        updatedPaymentPayload = data;
        return {
          id: "pay-2",
          orderId: "order-pay-2",
          orderNo: "NO20260402099",
          userId: "user-1",
          provider: "mock",
          status: data.status,
          amount: 99,
          currency: "CNY",
          paymentNo: "MP20260402099",
          mockToken: "mock_token_001",
          preparedAt: new Date("2026-04-02T10:00:00Z"),
          paidAt: new Date("2026-04-02T10:06:00Z"),
          expiresAt: new Date("2026-04-02T10:15:00Z")
        };
      }
    }
  };

  const result = await orderModule.methods.confirmMockOrderPayment("session-token", "NO20260402099", {
    mockToken: "mock_token_001",
    scene: "checkout"
  });

  assert.equal(updatedPaymentPayload.status, "paid");
  assert.equal(result.status, "paid");
  assert.equal(result.statusText, "支付成功");
  assert.equal(result.order.id, "NO20260402099");
});

test("order payment prepare uses wechat_jsapi and persists requestPayment payload", async () => {
  const previousPaymentProvider = process.env.PAYMENT_PROVIDER;
  let prepareWechatPayload = null;
  let createdPaymentPayload = null;

  process.env.PAYMENT_PROVIDER = "wechat_jsapi";

  try {
    const orderModule = createOrderModule({
      prepareWechatJsapiPaymentFn: async (input = {}) => {
        prepareWechatPayload = input;
        return {
          provider: "wechat_jsapi",
          prepayId: "wx_prepay_001",
          requestPayment: {
            timeStamp: "1713000000",
            nonceStr: "nonce_001",
            package: "prepay_id=wx_prepay_001",
            signType: "RSA",
            paySign: "SIGN_001"
          }
        };
      },
      getCurrentUserContext: async () => ({
        prisma: {
          $transaction: async (handler) => handler(tx)
        },
        user: {
          id: "user-1"
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
          id: "order-pay-3",
          orderNo: "NO20260402111",
          userId: "user-1",
          status: "pending",
          payableAmount: 120.5,
          user: {
            openId: "wx_openid_001"
          },
          address: null,
          afterSale: null,
          items: []
        })
      },
      paymentOrder: {
        findUnique: async () => null,
        create: async ({ data }) => {
          createdPaymentPayload = data;
          return {
            id: "pay-3",
            ...data
          };
        }
      }
    };

    const result = await orderModule.methods.prepareOrderPayment("session-token", "NO20260402111", {
      scene: "checkout"
    });

    assert.equal(prepareWechatPayload.outTradeNo, "NO20260402111");
    assert.equal(prepareWechatPayload.totalAmountFen, 12050);
    assert.equal(prepareWechatPayload.payerOpenId, "wx_openid_001");
    assert.equal(createdPaymentPayload.provider, "wechat_jsapi");
    assert.equal(createdPaymentPayload.paymentNo, "wx_prepay_001");
    assert.equal(result.provider, "wechat_jsapi");
    assert.equal(result.requestPayment.package, "prepay_id=wx_prepay_001");
  } finally {
    if (typeof previousPaymentProvider === "undefined") {
      delete process.env.PAYMENT_PROVIDER;
    } else {
      process.env.PAYMENT_PROVIDER = previousPaymentProvider;
    }
  }
});

test("order payment prepare returns PAYMENT_OPENID_REQUIRED when wechat openId is missing", async () => {
  const previousPaymentProvider = process.env.PAYMENT_PROVIDER;

  process.env.PAYMENT_PROVIDER = "wechat_jsapi";

  try {
    const orderModule = createOrderModule({
      prepareWechatJsapiPaymentFn: async (input = {}) => {
        if (!String(input.payerOpenId || "").trim()) {
          const error = new Error("当前账号缺少微信 openId，请重新登录后重试");
          error.statusCode = 409;
          error.code = "PAYMENT_OPENID_REQUIRED";
          throw error;
        }

        return {
          prepayId: "wx_prepay_unused",
          requestPayment: {}
        };
      },
      getCurrentUserContext: async () => ({
        prisma: {
          $transaction: async (handler) => handler(tx)
        },
        user: {
          id: "user-1"
        }
      })
    });
    const tx = {
      order: {
        findFirst: async () => ({
          id: "order-pay-4",
          orderNo: "NO20260402112",
          userId: "user-1",
          status: "pending",
          payableAmount: 88,
          user: {
            openId: ""
          },
          address: null,
          afterSale: null,
          items: []
        })
      },
      paymentOrder: {
        findUnique: async () => null
      }
    };

    await assert.rejects(
      () => orderModule.methods.prepareOrderPayment("session-token", "NO20260402112", {
        scene: "checkout"
      }),
      (error) => {
        assert.equal(error && error.code, "PAYMENT_OPENID_REQUIRED");
        return true;
      }
    );
  } finally {
    if (typeof previousPaymentProvider === "undefined") {
      delete process.env.PAYMENT_PROVIDER;
    } else {
      process.env.PAYMENT_PROVIDER = previousPaymentProvider;
    }
  }
});

test("wechat pay notify marks prepared payment as paid", async () => {
  let updatedPaymentPayload = null;
  const tx = {
    order: {
      findUnique: async () => ({
        id: "order-pay-5",
        orderNo: "NO20260402113",
        userId: "user-1",
        status: "pending",
        payableAmount: 66,
        user: {
          openId: "wx_openid_001"
        },
        address: null,
        afterSale: null,
        items: []
      })
    },
    paymentOrder: {
      findUnique: async () => ({
        id: "pay-5",
        orderId: "order-pay-5",
        orderNo: "NO20260402113",
        userId: "user-1",
        provider: "wechat_jsapi",
        status: "prepared",
        amount: 66,
        currency: "CNY",
        paymentNo: "wx_prepay_002",
        mockToken: null,
        preparedAt: new Date("2026-04-02T10:00:00Z"),
        paidAt: null,
        expiresAt: new Date("2026-04-02T10:15:00Z")
      }),
      update: async ({ data }) => {
        updatedPaymentPayload = data;
        return {
          id: "pay-5",
          orderId: "order-pay-5",
          orderNo: "NO20260402113",
          userId: "user-1",
          provider: data.provider,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          paymentNo: data.paymentNo,
          mockToken: null,
          preparedAt: data.preparedAt || new Date("2026-04-02T10:00:00Z"),
          paidAt: data.paidAt,
          expiresAt: new Date("2026-04-02T10:15:00Z"),
          resultPayloadJson: data.resultPayloadJson
        };
      }
    }
  };
  const orderModule = createOrderModule({
    getPrisma: async () => ({
      $transaction: async (handler) => handler(tx)
    }),
    parseWechatPayNotificationFn: () => ({
      notifyId: "notify_001",
      eventType: "TRANSACTION.SUCCESS",
      summary: "支付成功",
      outTradeNo: "NO20260402113",
      tradeState: "SUCCESS",
      transactionId: "wx_txn_001",
      successTime: "2026-04-02T10:06:00+08:00",
      transaction: {
        out_trade_no: "NO20260402113",
        trade_state: "SUCCESS"
      }
    }),
    mapOrder: (order = {}) => ({
      id: order.orderNo || "",
      status: order.status || ""
    })
  });

  const result = await orderModule.methods.handleWechatPayNotify({
    rawBody: "{}",
    body: {}
  });

  assert.equal(updatedPaymentPayload.provider, "wechat_jsapi");
  assert.equal(updatedPaymentPayload.status, "paid");
  assert.equal(updatedPaymentPayload.paymentNo, "wx_txn_001");
  assert.equal(result.status, "paid");
  assert.equal(result.order.id, "NO20260402113");
});
