function createStorefrontPrismaDistributionModule({
  defaultDistributorProfile,
  buildCoverLabel,
  ensureCouponFeatureData,
  formatDate,
  formatDateTime,
  getCurrentUserContext,
  getReferralBindingByInvitee,
  mapUser,
  mapUserCoupon,
  normalizeSourceScene,
  toNumber
}) {
  function getCommissionStatusText(status) {
    if (status === "settled") {
      return "已结算";
    }

    return "待结算";
  }

  function getDistributorCommissionRate(profile = {}) {
    const level = String((profile || {}).level || "").trim();

    if (level.indexOf("高级") > -1 || level.indexOf("合伙人") > -1) {
      return 0.08;
    }

    return 0.05;
  }

  function getStartOfToday() {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return today;
  }

  function mapDistributor(profile = {}) {
    return {
      level: profile.level || "普通分销员",
      totalCommission: toNumber(profile.totalCommission),
      pendingCommission: toNumber(profile.pendingCommission),
      settledCommission: toNumber(profile.settledCommission),
      teamCount: Number(profile.teamCount || 0),
      todayInviteCount: Number(profile.todayInviteCount || 0)
    };
  }

  function mapTeamMember(member = {}) {
    return {
      id: member.id,
      nickname: member.nickname || "",
      avatarLabel: member.avatarLabel || buildCoverLabel(member.nickname || "成员").slice(0, 1),
      joinedAt: formatDate(member.joinedAt),
      contributedAmount: toNumber(member.contributedAmount)
    };
  }

  function mapCommissionRecord(record = {}) {
    return {
      id: record.id,
      title: record.title || "",
      fromUser: record.fromUser || "",
      orderNo: record.orderNo || "",
      amount: toNumber(record.amount),
      levelText: record.levelText || "",
      status: record.status || "pending",
      statusText: getCommissionStatusText(record.status),
      createdAt: formatDateTime(record.createdAt)
    };
  }

  function buildCommissionTitleFromOrderItems(items = []) {
    const firstTitle = String((((items || [])[0] || {}).title || "")).trim();

    if (!firstTitle) {
      return "订单成交分佣";
    }

    if ((items || []).length > 1) {
      return `${firstTitle} 等 ${(items || []).length} 件商品`;
    }

    return firstTitle;
  }

  async function ensureDistributorFeatureData(prisma, userId) {
    return prisma.distributorProfile.upsert({
      where: {
        userId
      },
      update: {},
      create: {
        userId,
        level: defaultDistributorProfile.level,
        status: "active",
        totalCommission: defaultDistributorProfile.totalCommission,
        pendingCommission: defaultDistributorProfile.pendingCommission,
        settledCommission: defaultDistributorProfile.settledCommission,
        teamCount: defaultDistributorProfile.teamCount,
        todayInviteCount: defaultDistributorProfile.todayInviteCount,
        joinedAt: defaultDistributorProfile.joinedAt,
        createdAt: defaultDistributorProfile.joinedAt,
        updatedAt: defaultDistributorProfile.joinedAt
      }
    });
  }

  async function buildDirectInviteTeamMembers(prisma, inviterUserId) {
    const bindings = await prisma.referralBinding.findMany({
      where: {
        inviterUserId
      },
      include: {
        invitee: true
      },
      orderBy: {
        boundAt: "desc"
      }
    });

    if (!bindings.length) {
      return [];
    }

    const orderSums = await prisma.order.groupBy({
      by: ["userId"],
      where: {
        userId: {
          in: bindings.map((item) => item.inviteeUserId)
        },
        inviterUserId,
        status: {
          in: ["shipping", "done"]
        }
      },
      _sum: {
        payableAmount: true
      }
    });
    const contributedAmountMap = new Map(
      orderSums.map((item) => [item.userId, toNumber((item._sum || {}).payableAmount)])
    );

    return bindings.map((binding) => ({
      id: binding.invitee.id,
      nickname: binding.invitee.nickname || "",
      avatarLabel: buildCoverLabel(binding.invitee.nickname || "成员").slice(0, 1),
      joinedAt: formatDate(binding.boundAt),
      contributedAmount: toNumber(contributedAmountMap.get(binding.inviteeUserId) || 0)
    }));
  }

  async function buildDistributorSnapshot(prisma, user, profile) {
    const directTeamMembers = await buildDirectInviteTeamMembers(prisma, user.id);

    if (directTeamMembers.length) {
      const todayStart = getStartOfToday();
      const todayInviteCount = await prisma.referralBinding.count({
        where: {
          inviterUserId: user.id,
          boundAt: {
            gte: todayStart
          }
        }
      });

      return {
        ...profile,
        teamCount: directTeamMembers.length,
        todayInviteCount
      };
    }

    const fallbackProfile = await prisma.distributorProfile.findUnique({
      where: {
        id: profile.id
      }
    });
    const todayStart = getStartOfToday();
    const [fallbackTeamCount, fallbackTodayInviteCount] = await Promise.all([
      prisma.teamMember.count({
        where: {
          distributorId: profile.id
        }
      }),
      prisma.teamMember.count({
        where: {
          distributorId: profile.id,
          joinedAt: {
            gte: todayStart
          }
        }
      })
    ]);

    return {
      ...(fallbackProfile || profile),
      teamCount: fallbackTeamCount || Number((fallbackProfile || profile).teamCount || 0),
      todayInviteCount: fallbackTodayInviteCount || Number((fallbackProfile || profile).todayInviteCount || 0)
    };
  }

  async function getTeamMembersForDistributor(prisma, user, profile) {
    const directTeamMembers = await buildDirectInviteTeamMembers(prisma, user.id);

    if (directTeamMembers.length) {
      return directTeamMembers;
    }

    const teamMembers = await prisma.teamMember.findMany({
      where: {
        distributorId: profile.id
      },
      orderBy: {
        joinedAt: "desc"
      }
    });

    return teamMembers.map((item) => mapTeamMember(item));
  }

  async function getDistributorContext(prisma, user) {
    const distributorProfile = await ensureDistributorFeatureData(prisma, user.id);
    const distributorSnapshot = await buildDistributorSnapshot(prisma, user, distributorProfile);

    return {
      distributorProfile,
      distributorSnapshot,
      distributor: mapDistributor(distributorSnapshot || {})
    };
  }

  async function buildOrderReferralSnapshot(prisma, user, cartItems = []) {
    const emptySnapshot = {
      referralBindingId: null,
      inviterUserId: null,
      sourceScene: "direct",
      commissionBaseAmount: 0,
      commissionRate: 0,
      commissionAmount: 0
    };

    if (!user || !user.id) {
      return emptySnapshot;
    }

    const binding = await getReferralBindingByInvitee(prisma, user.id);

    if (!binding || !binding.inviterUserId) {
      return emptySnapshot;
    }

    const productIds = Array.from(new Set(
      (cartItems || [])
        .map((item) => item.productId)
        .filter(Boolean)
    ));
    const products = productIds.length
      ? await prisma.product.findMany({
        where: {
          id: {
            in: productIds
          }
        }
      })
      : [];
    const productMap = new Map(products.map((item) => [item.id, item]));
    const commissionBaseAmount = Number((cartItems || []).reduce((sum, item) => {
      const product = productMap.get(item.productId);

      if (product && product.distributionEnabled === false) {
        return sum;
      }

      return sum + toNumber(item.price) * Number(item.quantity || 0);
    }, 0).toFixed(2));
    const inviterProfile = await ensureDistributorFeatureData(prisma, binding.inviterUserId);
    const commissionRate = inviterProfile && inviterProfile.status === "active"
      ? getDistributorCommissionRate(inviterProfile)
      : 0;
    const commissionAmount = Number((commissionBaseAmount * commissionRate).toFixed(2));

    return {
      referralBindingId: binding.id,
      inviterUserId: binding.inviterUserId,
      sourceScene: normalizeSourceScene(binding.sourceScene, "share"),
      commissionBaseAmount,
      commissionRate,
      commissionAmount
    };
  }

  async function syncDistributionAfterOrderDone(prisma, user, order) {
    if (!order || !order.id) {
      return null;
    }

    if (!order.inviterUserId) {
      return null;
    }

    const commissionAmount = toNumber(order.commissionAmount);

    if (commissionAmount <= 0) {
      return null;
    }

    const distributorProfile = await ensureDistributorFeatureData(prisma, order.inviterUserId);

    if (!distributorProfile || distributorProfile.status !== "active") {
      return null;
    }

    const existingRecord = await prisma.commissionRecord.findFirst({
      where: {
        distributorId: distributorProfile.id,
        orderNo: order.orderNo
      }
    });

    if (existingRecord) {
      return existingRecord;
    }

    const items = await prisma.orderItem.findMany({
      where: {
        orderId: order.id
      },
      include: {
        product: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    await prisma.distributorProfile.update({
      where: {
        id: distributorProfile.id
      },
      data: {
        totalCommission: {
          increment: commissionAmount
        },
        pendingCommission: {
          increment: commissionAmount
        }
      }
    });

    return prisma.commissionRecord.create({
      data: {
        distributorId: distributorProfile.id,
        title: buildCommissionTitleFromOrderItems(items),
        fromUser: String(user.nickname || "微信用户").trim() || "微信用户",
        orderNo: order.orderNo,
        amount: commissionAmount,
        levelText: "一级佣金",
        status: "pending"
      }
    });
  }

  return {
    helpers: {
      buildOrderReferralSnapshot,
      getDistributorContext,
      syncDistributionAfterOrderDone
    },
    methods: {
      async getDistributionData(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const { distributor } = await getDistributorContext(prisma, user);

        return {
          user: mapUser(user),
          distributor
        };
      },
      async getTeamData(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const { distributorProfile, distributor } = await getDistributorContext(prisma, user);
        const teamMembers = await getTeamMembersForDistributor(prisma, user, distributorProfile);

        return {
          teamMembers,
          distributor
        };
      },
      async getCommissionData(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const { distributorProfile, distributor } = await getDistributorContext(prisma, user);
        const records = await prisma.commissionRecord.findMany({
          where: {
            distributorId: distributorProfile.id
          },
          orderBy: {
            createdAt: "desc"
          }
        });

        return {
          records: records.map((item) => mapCommissionRecord(item)),
          distributor
        };
      },
      async getPosterData(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await ensureCouponFeatureData(prisma, user.id);

        const { distributor } = await getDistributorContext(prisma, user);
        const coupons = await prisma.userCoupon.findMany({
          where: {
            userId: user.id
          },
          include: {
            template: true
          },
          orderBy: [
            {
              claimedAt: "desc"
            }
          ]
        });
        const posterCoupon = coupons.find((item) => item.status === "available") || coupons[0] || null;

        return {
          user: mapUser(user),
          distributor,
          coupon: posterCoupon ? mapUserCoupon(posterCoupon) : null,
          sharePath: `/pages/home/index?inviterUserId=${encodeURIComponent(user.id)}&sourceScene=share`
        };
      }
    }
  };
}

module.exports = {
  createStorefrontPrismaDistributionModule
};
