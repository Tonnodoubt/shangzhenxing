const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontPrismaProfileModule } = require("../src/repositories/storefront/prisma-profile");

function createProfileModule(overrides = {}) {
  return createStorefrontPrismaProfileModule({
    cartHelpers: {
      getCartItems: async () => [],
      getSelectedAddress: async () => null
    },
    couponHelpers: {
      ensureCouponFeatureData: async () => {}
    },
    distributionHelpers: {
      getDistributorContext: async () => ({
        distributor: {
          level: "普通分销员"
        }
      })
    },
    getCurrentUserContext: async () => ({
      prisma: {},
      user: {
        id: "user-1",
        nickname: "阿青"
      }
    }),
    mapAddress: (address) => address,
    mapUser: (user = {}) => ({
      id: user.id || "",
      nickname: user.nickname || "",
      isAuthorized: !!user.isAuthorized
    }),
    mapUserCoupon: (coupon = {}) => ({
      id: coupon.id || "",
      title: ((coupon.template || {}).title) || ""
    }),
    ...overrides
  });
}

test("profile method aggregates address coupon cart and distributor data", async () => {
  let ensuredCouponUserId = null;
  const profileModule = createProfileModule({
    cartHelpers: {
      getSelectedAddress: async () => ({
        id: "addr-1",
        receiver: "张三"
      }),
      getCartItems: async () => ([
        {
          id: "item-1",
          quantity: 2
        },
        {
          id: "item-2",
          quantity: 3
        }
      ])
    },
    couponHelpers: {
      ensureCouponFeatureData: async (_prisma, userId) => {
        ensuredCouponUserId = userId;
      }
    },
    distributionHelpers: {
      getDistributorContext: async () => ({
        distributor: {
          level: "高级分销员",
          totalCommission: 88
        }
      })
    },
    getCurrentUserContext: async () => ({
      prisma: {
        order: {
          count: async () => 7
        },
        userCoupon: {
          findMany: async () => ([
            {
              id: "coupon-1",
              template: {
                title: "满 99 减 20"
              }
            }
          ])
        }
      },
      user: {
        id: "user-1",
        nickname: "阿青",
        isAuthorized: true
      }
    })
  });

  const result = await profileModule.methods.getProfileData("session-token");

  assert.equal(ensuredCouponUserId, "user-1");
  assert.deepEqual(result, {
    user: {
      id: "user-1",
      nickname: "阿青",
      isAuthorized: true
    },
    address: {
      id: "addr-1",
      receiver: "张三"
    },
    coupons: [
      {
        id: "coupon-1",
        title: "满 99 减 20"
      }
    ],
    cartCount: 5,
    runtimeOrderCount: 7,
    distributor: {
      level: "高级分销员",
      totalCommission: 88
    }
  });
});

test("profile method authorizes current user with mapped payload", async () => {
  let updatedPayload = null;
  const profileModule = createProfileModule({
    getCurrentUserContext: async () => ({
      prisma: {
        user: {
          update: async (payload) => {
            updatedPayload = payload;
            return {
              id: "user-2",
              nickname: "微信用户",
              isAuthorized: true
            };
          }
        }
      },
      user: {
        id: "user-2"
      }
    })
  });

  const result = await profileModule.methods.authorizeUser("session-token");

  assert.deepEqual(updatedPayload, {
    where: {
      id: "user-2"
    },
    data: {
      nickname: "微信用户",
      isAuthorized: true
    }
  });
  assert.deepEqual(result, {
    id: "user-2",
    nickname: "微信用户",
    isAuthorized: true
  });
});
