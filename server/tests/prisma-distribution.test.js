const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontPrismaDistributionModule } = require("../src/repositories/storefront/prisma-distribution");

const DEFAULT_DISTRIBUTOR_PROFILE = {
  level: "普通分销员",
  totalCommission: 0,
  pendingCommission: 0,
  settledCommission: 0,
  teamCount: 0,
  todayInviteCount: 0,
  joinedAt: new Date("2026-03-30T09:00:00+08:00")
};

function formatDate(date) {
  const current = new Date(date);

  return [
    current.getFullYear(),
    String(current.getMonth() + 1).padStart(2, "0"),
    String(current.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDateTime(date) {
  const current = new Date(date);

  return `${formatDate(current)} ${String(current.getHours()).padStart(2, "0")}:${String(current.getMinutes()).padStart(2, "0")}`;
}

function createDistributionModule(overrides = {}) {
  return createStorefrontPrismaDistributionModule({
    defaultDistributorProfile: DEFAULT_DISTRIBUTOR_PROFILE,
    buildCoverLabel: (title = "") => String(title || "").trim().slice(0, 1) || "默",
    ensureCouponFeatureData: async () => {},
    formatDate,
    formatDateTime,
    getCurrentUserContext: async () => ({
      prisma: {},
      user: {
        id: "user-1",
        nickname: "阿青"
      }
    }),
    getReferralBindingByInvitee: async () => null,
    mapUser: (user = {}) => ({
      id: user.id || "",
      nickname: user.nickname || ""
    }),
    mapUserCoupon: (coupon = {}) => ({
      id: coupon.id || "",
      title: ((coupon.template || {}).title) || ""
    }),
    normalizeSourceScene: (value, fallback = "share") => String(value || "").trim() || fallback,
    toNumber: (value) => Number(value || 0),
    ...overrides
  });
}

test("distribution helper builds referral snapshots from eligible products only", async () => {
  const distributionModule = createDistributionModule({
    getReferralBindingByInvitee: async () => ({
      id: "binding-1",
      inviterUserId: "inviter-1",
      sourceScene: "poster_share"
    })
  });
  const prisma = {
    product: {
      findMany: async () => ([
        {
          id: "prod-1",
          distributionEnabled: true
        },
        {
          id: "prod-2",
          distributionEnabled: false
        }
      ])
    },
    distributorProfile: {
      upsert: async () => ({
        id: "dist-1",
        status: "active",
        level: "高级分销员"
      })
    }
  };

  const snapshot = await distributionModule.helpers.buildOrderReferralSnapshot(
    prisma,
    {
      id: "user-2"
    },
    [
      {
        productId: "prod-1",
        price: 20,
        quantity: 2
      },
      {
        productId: "prod-2",
        price: 99,
        quantity: 1
      }
    ]
  );

  assert.deepEqual(snapshot, {
    referralBindingId: "binding-1",
    inviterUserId: "inviter-1",
    sourceScene: "poster_share",
    commissionBaseAmount: 40,
    commissionRate: 0.08,
    commissionAmount: 3.2
  });
});

test("distribution helper records commission once an invited order is done", async () => {
  let updatedProfilePayload = null;
  const distributionModule = createDistributionModule();
  const prisma = {
    distributorProfile: {
      upsert: async () => ({
        id: "dist-9",
        status: "active",
        level: "普通分销员"
      }),
      update: async (payload) => {
        updatedProfilePayload = payload;
        return payload;
      }
    },
    commissionRecord: {
      findFirst: async () => null,
      create: async ({ data }) => ({
        id: "commission-1",
        ...data
      })
    },
    orderItem: {
      findMany: async () => ([
        {
          title: "坚果礼盒"
        },
        {
          title: "乌龙轻饮"
        }
      ])
    }
  };

  const record = await distributionModule.helpers.syncDistributionAfterOrderDone(
    prisma,
    {
      nickname: "测试买家"
    },
    {
      id: "order-1",
      orderNo: "NO20260402001",
      inviterUserId: "inviter-9",
      commissionAmount: 8
    }
  );

  assert.deepEqual(updatedProfilePayload, {
    where: {
      id: "dist-9"
    },
    data: {
      totalCommission: {
        increment: 8
      },
      pendingCommission: {
        increment: 8
      }
    }
  });
  assert.equal(record.title, "坚果礼盒 等 2 件商品");
  assert.equal(record.fromUser, "测试买家");
  assert.equal(record.amount, 8);
  assert.equal(record.status, "pending");
});

test("distribution methods expose mapped commission records", async () => {
  const distributionModule = createDistributionModule({
    getCurrentUserContext: async () => ({
      prisma: {
        distributorProfile: {
          upsert: async () => ({
            id: "dist-2",
            userId: "user-1",
            level: "普通分销员",
            totalCommission: 12,
            pendingCommission: 5,
            settledCommission: 7,
            teamCount: 0,
            todayInviteCount: 0,
            status: "active"
          }),
          findUnique: async () => ({
            id: "dist-2",
            level: "普通分销员",
            totalCommission: 12,
            pendingCommission: 5,
            settledCommission: 7,
            teamCount: 0,
            todayInviteCount: 0
          })
        },
        referralBinding: {
          findMany: async () => []
        },
        teamMember: {
          count: async () => 0
        },
        commissionRecord: {
          findMany: async () => ([
            {
              id: "commission-2",
              title: "每日精选零食礼盒",
              fromUser: "林小满",
              orderNo: "NO20260401088",
              amount: 18,
              levelText: "一级佣金",
              status: "settled",
              createdAt: new Date("2026-04-01T11:20:00+08:00")
            }
          ])
        }
      },
      user: {
        id: "user-1",
        nickname: "阿青"
      }
    })
  });

  const result = await distributionModule.methods.getCommissionData("session-token");

  assert.deepEqual(result.distributor, {
    level: "普通分销员",
    totalCommission: 12,
    pendingCommission: 5,
    settledCommission: 7,
    teamCount: 0,
    todayInviteCount: 0
  });
  assert.deepEqual(result.records, [
    {
      id: "commission-2",
      title: "每日精选零食礼盒",
      fromUser: "林小满",
      orderNo: "NO20260401088",
      amount: 18,
      levelText: "一级佣金",
      status: "settled",
      statusText: "已结算",
      createdAt: "2026-04-01 11:20"
    }
  ]);
});

test("distribution methods build poster payloads with share path and available coupon", async () => {
  let couponFeatureSeeded = false;
  const distributionModule = createDistributionModule({
    ensureCouponFeatureData: async () => {
      couponFeatureSeeded = true;
    },
    getCurrentUserContext: async () => ({
      prisma: {
        distributorProfile: {
          upsert: async () => ({
            id: "dist-3",
            userId: "user-1",
            level: "普通分销员",
            totalCommission: 26,
            pendingCommission: 8,
            settledCommission: 18,
            teamCount: 0,
            todayInviteCount: 0,
            status: "active"
          }),
          findUnique: async () => ({
            id: "dist-3",
            level: "普通分销员",
            totalCommission: 26,
            pendingCommission: 8,
            settledCommission: 18,
            teamCount: 0,
            todayInviteCount: 0
          })
        },
        referralBinding: {
          findMany: async () => []
        },
        teamMember: {
          count: async () => 0
        },
        userCoupon: {
          findMany: async () => ([
            {
              id: "coupon-1",
              status: "used",
              template: {
                title: "已用券"
              }
            },
            {
              id: "coupon-2",
              status: "available",
              template: {
                title: "分享成交券"
              }
            }
          ])
        }
      },
      user: {
        id: "user-1",
        nickname: "阿青"
      }
    })
  });

  const result = await distributionModule.methods.getPosterData("session-token");

  assert.equal(couponFeatureSeeded, true);
  assert.deepEqual(result.user, {
    id: "user-1",
    nickname: "阿青"
  });
  assert.deepEqual(result.distributor, {
    level: "普通分销员",
    totalCommission: 26,
    pendingCommission: 8,
    settledCommission: 18,
    teamCount: 0,
    todayInviteCount: 0
  });
  assert.deepEqual(result.coupon, {
    id: "coupon-2",
    title: "分享成交券"
  });
  assert.equal(result.sharePath, "/pages/home/index?inviterUserId=user-1&sourceScene=share");
});
