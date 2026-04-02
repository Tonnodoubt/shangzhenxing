const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontPrismaCouponModule } = require("../src/repositories/storefront/prisma-coupon");

function buildCheckoutSummary(cartItems = [], coupon = null) {
  const goodsAmountNumber = (cartItems || []).reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);
  const totalCount = (cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const discountAmountNumber = coupon && goodsAmountNumber >= Number(coupon.threshold || 0)
    ? Math.min(Number(coupon.amount || 0), goodsAmountNumber)
    : 0;
  const payableAmountNumber = Math.max(goodsAmountNumber - discountAmountNumber, 0);
  const formatMoney = (value) => Number(value || 0).toFixed(2);

  return {
    totalCount,
    goodsAmountNumber,
    discountAmountNumber,
    payableAmountNumber,
    goodsAmount: formatMoney(goodsAmountNumber),
    discountAmount: formatMoney(discountAmountNumber),
    payableAmount: formatMoney(payableAmountNumber)
  };
}

function createCouponModule(overrides = {}) {
  return createStorefrontPrismaCouponModule({
    defaultCouponTemplates: [],
    defaultGrantedCoupons: [],
    buildCheckoutSummary,
    ensureCart: async () => ({
      id: "cart-1"
    }),
    getCartItems: async () => [],
    getCartRecord: async () => ({
      id: "cart-1",
      selectedCouponId: ""
    }),
    getCurrentUserContext: async () => ({
      prisma: {},
      user: {
        id: "user-1"
      }
    }),
    getSelectedAddress: async () => null,
    mapAddress: (address) => address,
    mapCartItem: (item) => item,
    mapCouponTemplate: (template = {}, options = {}) => ({
      id: template.id || "",
      claimed: !!options.claimed
    }),
    mapUserCoupon: (coupon = {}) => ({
      id: coupon.id || "",
      title: ((coupon.template || {}).title) || ""
    }),
    toNumber: (value) => Number(value || 0),
    ...overrides
  });
}

test("coupon helper restores used coupons for cancelled orders", async () => {
  let updatePayload = null;
  const couponModule = createCouponModule();
  const prisma = {
    userCoupon: {
      findFirst: async () => ({
        id: "coupon-used-1",
        status: "used"
      }),
      update: async (payload) => {
        updatePayload = payload;
        return payload;
      }
    }
  };

  await couponModule.helpers.restoreUsedCouponForOrder(prisma, "order-1");

  assert.deepEqual(updatePayload, {
    where: {
      id: "coupon-used-1"
    },
    data: {
      status: "available",
      usedAt: null,
      usedOrderId: null
    }
  });
});

test("coupon method blocks selection when amount does not meet threshold", async () => {
  let cartUpdated = false;
  const prisma = {
    couponTemplate: {
      findMany: async () => []
    },
    userCoupon: {
      updateMany: async () => null,
      findFirst: async () => ({
        id: "coupon-1",
        status: "available",
        expiresAt: new Date("2026-05-01T00:00:00+08:00"),
        template: {
          amount: 20,
          threshold: 99
        }
      })
    },
    cart: {
      upsert: async () => ({
        id: "cart-1"
      }),
      update: async () => {
        cartUpdated = true;
      }
    }
  };
  const couponModule = createCouponModule({
    getCurrentUserContext: async () => ({
      prisma,
      user: {
        id: "user-1"
      }
    })
  });

  const result = await couponModule.methods.selectCoupon("session-token", "coupon-1", 50);

  assert.deepEqual(result, {
    ok: false,
    message: "当前金额还不能用这张券"
  });
  assert.equal(cartUpdated, false);
});

test("coupon method builds checkout payload from selected coupon", async () => {
  const prisma = {
    couponTemplate: {
      findMany: async () => []
    },
    userCoupon: {
      updateMany: async () => null,
      findFirst: async () => ({
        id: "coupon-2",
        status: "available",
        expiresAt: new Date("2026-05-01T00:00:00+08:00"),
        template: {
          title: "满 99 减 20",
          amount: 20,
          threshold: 99
        }
      })
    }
  };
  const couponModule = createCouponModule({
    getCurrentUserContext: async () => ({
      prisma,
      user: {
        id: "user-1"
      }
    }),
    getCartItems: async () => ([
      {
        id: "item-1",
        title: "坚果礼盒",
        price: 60,
        quantity: 2
      }
    ]),
    getCartRecord: async () => ({
      id: "cart-1",
      selectedCouponId: "coupon-2"
    }),
    getSelectedAddress: async () => ({
      id: "addr-1",
      receiver: "张三"
    }),
    mapAddress: (address) => ({
      id: address.id,
      receiver: address.receiver
    }),
    mapCartItem: (item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity
    }),
    mapUserCoupon: (coupon = {}) => ({
      id: coupon.id || "",
      title: ((coupon.template || {}).title) || ""
    })
  });

  const result = await couponModule.methods.getCheckoutPageData("session-token");

  assert.deepEqual(result, {
    address: {
      id: "addr-1",
      receiver: "张三"
    },
    cartItems: [
      {
        id: "item-1",
        title: "坚果礼盒",
        quantity: 2
      }
    ],
    totalCount: 2,
    goodsAmount: "120.00",
    discountAmount: "20.00",
    payableAmount: "100.00",
    goodsAmountNumber: 120,
    selectedCoupon: {
      id: "coupon-2",
      title: "满 99 减 20"
    }
  });
});

test("coupon method claims enabled templates once", async () => {
  let createdPayload = null;
  const prisma = {
    couponTemplate: {
      findMany: async () => [],
      findFirst: async () => ({
        id: "tpl-1",
        validDays: 7
      })
    },
    userCoupon: {
      updateMany: async () => null,
      findFirst: async () => null,
      create: async (payload) => {
        createdPayload = payload;

        return {
          id: "coupon-3",
          ...payload.data,
          template: {
            title: "新人立减 20"
          }
        };
      }
    }
  };
  const couponModule = createCouponModule({
    getCurrentUserContext: async () => ({
      prisma,
      user: {
        id: "user-1"
      }
    })
  });

  const result = await couponModule.methods.claimCoupon("session-token", "tpl-1");

  assert.equal(result.ok, true);
  assert.equal(result.coupon.id, "coupon-3");
  assert.equal(result.coupon.title, "新人立减 20");
  assert.equal(createdPayload.data.userId, "user-1");
  assert.equal(createdPayload.data.templateId, "tpl-1");
  assert.equal(createdPayload.data.sourceType, "center_claim");
});
