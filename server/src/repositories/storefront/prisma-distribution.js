const { getShanghaiTodayRange } = require("../../../shared/utils");

function createStorefrontPrismaDistributionModule({
  createStorefrontError,
  defaultDistributorProfile,
  buildCoverLabel,
  ensureCouponFeatureData,
  formatDate,
  formatDateTime,
  getPrisma,
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

    if (status === "withdrawing") {
      return "提现中";
    }

    if (status === "withdrawn") {
      return "已提现";
    }

    if (status === "reversed") {
      return "已冲回";
    }

    return "待结算";
  }

  function getWithdrawalStatusText(status) {
    const statusMap = {
      submitted: "待审核",
      approved: "待打款",
      rejected: "已拒绝",
      paying: "打款中",
      paid: "已打款",
      pay_failed: "打款失败",
      cancelled: "已撤销"
    };

    return statusMap[String(status || "").trim()] || "未知状态";
  }

  function getDistributorCommissionRate(profile = {}) {
    const level = String((profile || {}).level || "").trim();

    if (level.indexOf("高级") > -1 || level.indexOf("合伙人") > -1) {
      return 0.08;
    }

    return 0.05;
  }

  function getStartOfToday() {
    return getShanghaiTodayRange().start;
  }

  function getWithdrawalAvailableAmount(profile = {}) {
    const settledCommission = toNumber((profile || {}).settledCommission);
    const withdrawingCommission = toNumber((profile || {}).withdrawingCommission);

    return Number(Math.max(settledCommission - withdrawingCommission, 0).toFixed(2));
  }

  function parseAmount(value) {
    const amount = Number(value || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      return 0;
    }

    return Number(amount.toFixed(2));
  }

  function maskAccountNo(accountNo) {
    const normalized = String(accountNo || "").replace(/\s+/g, "").trim();

    if (!normalized) {
      return "";
    }

    if (normalized.length <= 4) {
      return normalized;
    }

    return `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
  }

  function buildWithdrawalRequestNo(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
      hour12: false
    }).formatToParts(date);

    const get = (type) => (parts.find((item) => item.type === type) || {}).value || "00";

    return [
      "WD",
      get("year"),
      get("month"),
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
      get("fractionalSecond").padEnd(3, "0")
    ].join("");
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
      ruleVersionId: record.ruleVersionId || "",
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

  function mapWithdrawalRecord(record = {}, options = {}) {
    const distributor = record.distributor || {};
    const user = distributor.user || {};
    const latestPayout = Array.isArray(record.payouts) && record.payouts.length ? record.payouts[0] : null;

    const payload = {
      id: record.id,
      requestNo: record.requestNo || "",
      status: record.status || "submitted",
      statusText: getWithdrawalStatusText(record.status),
      amount: toNumber(record.amount),
      serviceFee: toNumber(record.serviceFee),
      netAmount: toNumber(record.netAmount),
      channel: record.channel || "manual_bank",
      accountName: record.accountName || "",
      accountNoMask: record.accountNoMask || "",
      remark: record.remark || "",
      reviewRemark: record.reviewRemark || "",
      reviewedBy: record.reviewedBy || "",
      reviewedAt: formatDateTime(record.reviewedAt),
      paidAt: formatDateTime(record.paidAt),
      createdAt: formatDateTime(record.createdAt),
      updatedAt: formatDateTime(record.updatedAt),
      latestPayout: latestPayout ? {
        id: latestPayout.id,
        channel: latestPayout.channel || "manual_bank",
        channelBillNo: latestPayout.channelBillNo || "",
        status: latestPayout.status || "",
        remark: latestPayout.remark || "",
        paidBy: latestPayout.paidBy || "",
        paidAt: formatDateTime(latestPayout.paidAt),
        createdAt: formatDateTime(latestPayout.createdAt)
      } : null
    };

    if (options.withDistributor) {
      payload.distributor = {
        distributorId: distributor.id || "",
        userId: distributor.userId || "",
        nickname: user.nickname || "",
        mobile: user.mobile || ""
      };
    }

    if (options.withItems) {
      payload.items = (record.items || []).map((item) => ({
        id: item.id,
        amount: toNumber(item.amount),
        commissionRecordId: item.commissionRecordId,
        commissionStatus: ((item.commissionRecord || {}).status) || "",
        commissionTitle: ((item.commissionRecord || {}).title) || "",
        commissionOrderNo: ((item.commissionRecord || {}).orderNo) || "",
        createdAt: formatDateTime(item.createdAt)
      }));
    }

    return payload;
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
      levelTwoInviterUserId: null,
      ruleVersionId: null,
      sourceScene: "direct",
      commissionBaseAmount: 0,
      commissionRate: 0,
      commissionAmount: 0,
      levelTwoCommissionRate: 0,
      levelTwoCommissionAmount: 0
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
    const [publishedRule, inviterProfile, levelTwoBinding] = await Promise.all([
      findPublishedDistributionRuleVersion(prisma),
      ensureDistributorFeatureData(prisma, binding.inviterUserId),
      getReferralBindingByInvitee(prisma, binding.inviterUserId)
    ]);
    const ruleEnabled = !publishedRule || publishedRule.enabled !== false;
    const configuredLevelOneRate = publishedRule
      ? Number((toNumber(publishedRule.levelOneRate) / 100).toFixed(4))
      : null;
    const configuredLevelTwoRate = publishedRule
      ? Number((toNumber(publishedRule.levelTwoRate) / 100).toFixed(4))
      : 0;
    const commissionRate = inviterProfile && inviterProfile.status === "active" && ruleEnabled
      ? (configuredLevelOneRate === null ? getDistributorCommissionRate(inviterProfile) : configuredLevelOneRate)
      : 0;
    const commissionAmount = Number((commissionBaseAmount * commissionRate).toFixed(2));
    const levelTwoInviterUserId = levelTwoBinding
      && levelTwoBinding.inviterUserId
      && levelTwoBinding.inviterUserId !== binding.inviterUserId
      && levelTwoBinding.inviterUserId !== user.id
      ? levelTwoBinding.inviterUserId
      : null;
    let levelTwoCommissionRate = 0;

    if (levelTwoInviterUserId && configuredLevelTwoRate > 0 && ruleEnabled) {
      const levelTwoProfile = await ensureDistributorFeatureData(prisma, levelTwoInviterUserId);

      if (levelTwoProfile && levelTwoProfile.status === "active") {
        levelTwoCommissionRate = configuredLevelTwoRate;
      }
    }

    const levelTwoCommissionAmount = Number((commissionBaseAmount * levelTwoCommissionRate).toFixed(2));

    return {
      referralBindingId: binding.id,
      inviterUserId: binding.inviterUserId,
      levelTwoInviterUserId,
      ruleVersionId: publishedRule ? publishedRule.id : null,
      sourceScene: normalizeSourceScene(binding.sourceScene, "share"),
      commissionBaseAmount,
      commissionRate,
      commissionAmount,
      levelTwoCommissionRate,
      levelTwoCommissionAmount
    };
  }

  async function syncDistributionAfterOrderDone(prisma, user, order) {
    if (!order || !order.id) {
      return null;
    }

    const levelOneAmount = toNumber(order.commissionAmount);
    const levelTwoAmount = toNumber(order.levelTwoCommissionAmount);
    const commissionPlans = [
      {
        inviterUserId: order.inviterUserId,
        amount: levelOneAmount,
        levelText: "一级佣金"
      },
      {
        inviterUserId: order.levelTwoInviterUserId,
        amount: levelTwoAmount,
        levelText: "二级佣金"
      }
    ].filter((item) => item.inviterUserId && item.amount > 0);

    if (!commissionPlans.length) {
      return null;
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
    const createdRecords = [];
    const ruleVersionId = order.ruleVersionId || null;

    for (const plan of commissionPlans) {
      const distributorProfile = await ensureDistributorFeatureData(prisma, plan.inviterUserId);

      if (!distributorProfile || distributorProfile.status !== "active") {
        continue;
      }

      const existingRecord = await prisma.commissionRecord.findFirst({
        where: {
          distributorId: distributorProfile.id,
          orderNo: order.orderNo,
          levelText: plan.levelText
        }
      });

      if (existingRecord) {
        createdRecords.push(existingRecord);
        continue;
      }

      await prisma.distributorProfile.update({
        where: {
          id: distributorProfile.id
        },
        data: {
          totalCommission: {
            increment: plan.amount
          },
          pendingCommission: {
            increment: plan.amount
          }
        }
      });

      const record = await prisma.commissionRecord.create({
        data: {
          distributorId: distributorProfile.id,
          ruleVersionId,
          title: buildCommissionTitleFromOrderItems(items),
          fromUser: String(user.nickname || "微信用户").trim() || "微信用户",
          orderNo: order.orderNo,
          amount: plan.amount,
          levelText: plan.levelText,
          status: "pending"
        }
      });

      createdRecords.push(record);
    }

    return createdRecords[0] || null;
  }

  async function buildUserWithdrawalList(prisma, distributorId) {
    const records = await prisma.withdrawalRequest.findMany({
      where: {
        distributorId
      },
      include: {
        payouts: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return records.map((item) => mapWithdrawalRecord(item));
  }

  async function buildAdminWithdrawalList(prisma, options = {}) {
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 20)));
    const skip = (page - 1) * pageSize;
    const status = String(options.status || "").trim();
    const keyword = String(options.keyword || options.search || "").trim();
    const where = {};

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        {
          requestNo: {
            contains: keyword
          }
        },
        {
          distributor: {
            is: {
              user: {
                is: {
                  nickname: {
                    contains: keyword
                  }
                }
              }
            }
          }
        },
        {
          distributor: {
            is: {
              user: {
                is: {
                  mobile: {
                    contains: keyword
                  }
                }
              }
            }
          }
        }
      ];
    }

    const [total, records] = await Promise.all([
      prisma.withdrawalRequest.count({ where }),
      prisma.withdrawalRequest.findMany({
        where,
        include: {
          distributor: {
            include: {
              user: true
            }
          },
          payouts: {
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: pageSize
      })
    ]);

    return {
      list: records.map((item) => mapWithdrawalRecord(item, { withDistributor: true })),
      page,
      pageSize,
      total
    };
  }

  async function updateDistributorBalancesForRelease(tx, distributorId, amount) {
    const profile = await tx.distributorProfile.findUnique({
      where: {
        id: distributorId
      }
    });

    if (!profile) {
      return;
    }

    const currentWithdrawing = toNumber(profile.withdrawingCommission);
    const currentWithdrawable = toNumber(profile.withdrawableCommission);
    const nextWithdrawing = Number(Math.max(currentWithdrawing - amount, 0).toFixed(2));
    const nextWithdrawable = Number((currentWithdrawable + amount).toFixed(2));

    await tx.distributorProfile.update({
      where: {
        id: distributorId
      },
      data: {
        withdrawingCommission: nextWithdrawing,
        withdrawableCommission: nextWithdrawable
      }
    });
  }

  async function updateDistributorBalancesForPaid(tx, distributorId, amount) {
    const profile = await tx.distributorProfile.findUnique({
      where: {
        id: distributorId
      }
    });

    if (!profile) {
      return;
    }

    const currentWithdrawing = toNumber(profile.withdrawingCommission);
    const currentWithdrawn = toNumber(profile.withdrawnCommission);
    const currentSettled = toNumber(profile.settledCommission);
    const currentWithdrawable = toNumber(profile.withdrawableCommission);

    await tx.distributorProfile.update({
      where: {
        id: distributorId
      },
      data: {
        withdrawingCommission: Number(Math.max(currentWithdrawing - amount, 0).toFixed(2)),
        withdrawnCommission: Number((currentWithdrawn + amount).toFixed(2)),
        settledCommission: Number(Math.max(currentSettled - amount, 0).toFixed(2)),
        withdrawableCommission: Number(Math.max(currentWithdrawable - amount, 0).toFixed(2))
      }
    });
  }

  async function assertUserWithdrawalPermission(prisma, userId, withdrawalId) {
    const distributorProfile = await ensureDistributorFeatureData(prisma, userId);
    const record = await prisma.withdrawalRequest.findUnique({
      where: {
        id: withdrawalId
      },
      include: {
        payouts: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      }
    });

    if (!record || record.distributorId !== distributorProfile.id) {
      return null;
    }

    return record;
  }

  function getDistributionRuleVersionStatusText(status) {
    if (status === "published") {
      return "已发布";
    }

    if (status === "archived") {
      return "已归档";
    }

    return "草稿";
  }

  function normalizeDistributorProfileStatus(value, fallback = "inactive") {
    const normalized = String(value || fallback).trim().toLowerCase();

    if (normalized === "active" || normalized === "enabled") {
      return "active";
    }

    return "inactive";
  }

  function normalizeRulePercent(value, fallback) {
    if (typeof value === "undefined") {
      return Number(Number(fallback || 0).toFixed(2));
    }

    const numericValue = Number(value || 0);

    if (!Number.isFinite(numericValue)) {
      return Number(Number(fallback || 0).toFixed(2));
    }

    return Number(Math.max(0, numericValue).toFixed(2));
  }

  function normalizeRuleFeeRate(value, fallback) {
    if (typeof value === "undefined") {
      return Number(Number(fallback || 0).toFixed(4));
    }

    const numericValue = Number(value || 0);

    if (!Number.isFinite(numericValue)) {
      return Number(Number(fallback || 0).toFixed(4));
    }

    return Number(Math.max(0, numericValue).toFixed(4));
  }

  function normalizeRuleMoney(value, fallback) {
    if (typeof value === "undefined") {
      return Number(Number(fallback || 0).toFixed(2));
    }

    const numericValue = Number(value || 0);

    if (!Number.isFinite(numericValue)) {
      return Number(Number(fallback || 0).toFixed(2));
    }

    return Number(Math.max(0, numericValue).toFixed(2));
  }

  function normalizeRuleDays(value, fallback) {
    if (typeof value === "undefined") {
      return Math.max(1, Math.round(Number(fallback || 15)));
    }

    const numericValue = Number(value || 0);

    if (!Number.isFinite(numericValue)) {
      return Math.max(1, Math.round(Number(fallback || 15)));
    }

    return Math.max(1, Math.round(numericValue));
  }

  function buildDistributionRuleVersionNo(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
      hour12: false
    }).formatToParts(date);

    const get = (type) => (parts.find((item) => item.type === type) || {}).value || "00";

    return [
      "DRV",
      get("year"),
      get("month"),
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
      get("fractionalSecond").padEnd(3, "0")
    ].join("");
  }

  function normalizeRuleDraftPayload(payload = {}, fallback = {}) {
    return {
      enabled: typeof payload.enabled === "undefined" ? fallback.enabled !== false : Boolean(payload.enabled),
      levelOneRate: normalizeRulePercent(payload.levelOneRate, fallback.levelOneRate || 8),
      levelTwoRate: normalizeRulePercent(payload.levelTwoRate, fallback.levelTwoRate || 3),
      bindDays: normalizeRuleDays(payload.bindDays, fallback.bindDays || 15),
      minWithdrawalAmount: normalizeRuleMoney(payload.minWithdrawalAmount, fallback.minWithdrawalAmount || 0),
      serviceFeeRate: normalizeRuleFeeRate(payload.serviceFeeRate, fallback.serviceFeeRate || 0),
      serviceFeeFixed: normalizeRuleMoney(payload.serviceFeeFixed, fallback.serviceFeeFixed || 0),
      ruleDesc: String(payload.ruleDesc || fallback.ruleDesc || "").trim()
    };
  }

  function mapDistributionRuleVersion(record = {}) {
    return {
      versionId: record.id || "",
      versionNo: record.versionNo || "",
      status: record.status || "draft",
      statusText: getDistributionRuleVersionStatusText(record.status),
      enabled: record.enabled !== false,
      levelOneRate: toNumber(record.levelOneRate),
      levelTwoRate: toNumber(record.levelTwoRate),
      bindDays: Number(record.bindDays || 0),
      minWithdrawalAmount: toNumber(record.minWithdrawalAmount),
      serviceFeeRate: toNumber(record.serviceFeeRate),
      serviceFeeFixed: toNumber(record.serviceFeeFixed),
      ruleDesc: record.ruleDesc || "",
      effectiveAt: formatDateTime(record.effectiveAt),
      publishedAt: formatDateTime(record.publishedAt),
      publishedBy: record.publishedBy || "",
      createdBy: record.createdBy || "",
      createdAt: formatDateTime(record.createdAt),
      updatedAt: formatDateTime(record.updatedAt)
    };
  }

  function mapDistributionRuleSummary(record = null) {
    if (!record) {
      return {
        enabled: true,
        levelOneRate: 8,
        levelTwoRate: 3,
        bindDays: 15,
        minWithdrawalAmount: 0,
        serviceFeeRate: 0,
        serviceFeeFixed: 0,
        ruleDesc: "",
        updatedAt: "",
        updatedBy: {
          adminUserId: "",
          realName: ""
        },
        activeVersionId: "",
        activeVersionNo: "",
        status: "draft",
        publishedAt: "",
        effectiveAt: ""
      };
    }

    const mapped = mapDistributionRuleVersion(record);

    return {
      enabled: mapped.enabled,
      levelOneRate: mapped.levelOneRate,
      levelTwoRate: mapped.levelTwoRate,
      bindDays: mapped.bindDays,
      minWithdrawalAmount: mapped.minWithdrawalAmount,
      serviceFeeRate: mapped.serviceFeeRate,
      serviceFeeFixed: mapped.serviceFeeFixed,
      ruleDesc: mapped.ruleDesc,
      updatedAt: mapped.updatedAt,
      updatedBy: {
        adminUserId: "",
        realName: mapped.publishedBy || mapped.createdBy || ""
      },
      activeVersionId: mapped.versionId,
      activeVersionNo: mapped.versionNo,
      status: mapped.status,
      publishedAt: mapped.publishedAt,
      effectiveAt: mapped.effectiveAt
    };
  }

  function buildRuleLogPayload(snapshot = {}) {
    try {
      return JSON.stringify({
        enabled: snapshot.enabled !== false,
        levelOneRate: toNumber(snapshot.levelOneRate),
        levelTwoRate: toNumber(snapshot.levelTwoRate),
        bindDays: Number(snapshot.bindDays || 0),
        minWithdrawalAmount: toNumber(snapshot.minWithdrawalAmount),
        serviceFeeRate: toNumber(snapshot.serviceFeeRate),
        serviceFeeFixed: toNumber(snapshot.serviceFeeFixed),
        ruleDesc: String(snapshot.ruleDesc || "")
      });
    } catch (error) {
      return null;
    }
  }

  function parseEffectiveDate(value) {
    const parsed = value ? new Date(value) : new Date();

    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
      return new Date();
    }

    return parsed;
  }

  async function findPublishedDistributionRuleVersion(prisma) {
    if (!prisma || !prisma.distributionRuleVersion || typeof prisma.distributionRuleVersion.findFirst !== "function") {
      return null;
    }

    return prisma.distributionRuleVersion.findFirst({
      where: {
        status: "published"
      },
      orderBy: [
        {
          publishedAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });
  }

  function mapAdminDistributorRecord(profile = {}) {
    const user = profile.user || {};
    const totalCommission = toNumber(profile.totalCommission);
    const pendingCommission = toNumber(profile.pendingCommission);

    return {
      distributorId: profile.id || "",
      userId: profile.userId || "",
      nickname: user.nickname || "",
      mobile: user.mobile || "",
      level: profile.level || "普通分销员",
      status: profile.status || "active",
      statusText: profile.status === "inactive" ? "已冻结" : "正常",
      teamCount: Number(profile.teamCount || 0),
      totalCommissionCent: Math.round(totalCommission * 100),
      totalCommissionText: totalCommission.toFixed(2),
      pendingCommissionCent: Math.round(pendingCommission * 100),
      pendingCommissionText: pendingCommission.toFixed(2),
      joinedAt: formatDateTime(profile.joinedAt)
    };
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
          },
          take: 100
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
      },
      async getAdminDistributionRules() {
        const prisma = await getPrisma();
        const publishedRule = await findPublishedDistributionRuleVersion(prisma);

        if (publishedRule) {
          return mapDistributionRuleSummary(publishedRule);
        }

        const latestRule = await prisma.distributionRuleVersion.findFirst({
          orderBy: {
            createdAt: "desc"
          }
        });

        return mapDistributionRuleSummary(latestRule || null);
      },
      async getAdminDistributionRuleVersions(options = {}) {
        const prisma = await getPrisma();
        const page = Math.max(1, Number(options.page || 1));
        const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 20)));
        const skip = (page - 1) * pageSize;
        const status = String(options.status || "").trim();
        const keyword = String(options.keyword || "").trim();
        const where = {};

        if (status) {
          where.status = status;
        }

        if (keyword) {
          where.OR = [
            {
              versionNo: {
                contains: keyword
              }
            },
            {
              ruleDesc: {
                contains: keyword
              }
            }
          ];
        }

        const active = await findPublishedDistributionRuleVersion(prisma);
        const [total, records] = await Promise.all([
          prisma.distributionRuleVersion.count({ where }),
          prisma.distributionRuleVersion.findMany({
            where,
            orderBy: {
              createdAt: "desc"
            },
            skip,
            take: pageSize
          })
        ]);

        return {
          list: records.map((item) => {
            const mapped = mapDistributionRuleVersion(item);
            return {
              ...mapped,
              isActive: !!(active && active.id === item.id)
            };
          }),
          page,
          pageSize,
          total,
          activeVersionId: active ? active.id : ""
        };
      },
      async createAdminDistributionRuleVersion(payload = {}, actor = {}) {
        const prisma = await getPrisma();
        const actorName = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";
        const actorId = String(actor.adminUserId || actor.id || "").trim();

        const created = await prisma.$transaction(async (tx) => {
          const baseRule = await tx.distributionRuleVersion.findFirst({
            where: {
              status: "published"
            },
            orderBy: [
              {
                publishedAt: "desc"
              },
              {
                createdAt: "desc"
              }
            ]
          }) || await tx.distributionRuleVersion.findFirst({
            orderBy: {
              createdAt: "desc"
            }
          });
          const normalized = normalizeRuleDraftPayload(payload, baseRule || {});
          const nextVersion = await tx.distributionRuleVersion.create({
            data: {
              versionNo: buildDistributionRuleVersionNo(),
              ...normalized,
              status: "draft",
              createdBy: actorName
            }
          });

          await tx.distributionRuleChangeLog.create({
            data: {
              ruleVersionId: nextVersion.id,
              action: "created_draft",
              summary: "创建分销规则草稿",
              payloadJson: buildRuleLogPayload(nextVersion),
              actorId: actorId || null,
              actorName: actorName || null
            }
          });

          return nextVersion;
        });

        return mapDistributionRuleVersion(created);
      },
      async publishAdminDistributionRuleVersion(ruleVersionId, payload = {}, actor = {}) {
        const prisma = await getPrisma();
        const actorName = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";
        const actorId = String(actor.adminUserId || actor.id || "").trim();
        const effectiveAt = parseEffectiveDate(payload.effectiveAt);

        const published = await prisma.$transaction(async (tx) => {
          const current = await tx.distributionRuleVersion.findUnique({
            where: {
              id: ruleVersionId
            }
          });

          if (!current) {
            return null;
          }

          if (current.status === "published") {
            return current;
          }

          await tx.distributionRuleVersion.updateMany({
            where: {
              status: "published",
              id: {
                not: current.id
              }
            },
            data: {
              status: "archived"
            }
          });

          const updated = await tx.distributionRuleVersion.update({
            where: {
              id: current.id
            },
            data: {
              status: "published",
              effectiveAt,
              publishedAt: new Date(),
              publishedBy: actorName || null
            }
          });

          await tx.distributionRuleChangeLog.create({
            data: {
              ruleVersionId: updated.id,
              action: "published",
              summary: "发布分销规则版本",
              payloadJson: buildRuleLogPayload(updated),
              actorId: actorId || null,
              actorName: actorName || null
            }
          });

          return updated;
        });

        return published ? mapDistributionRuleVersion(published) : null;
      },
      async getAdminDistributionRuleChangeLogs(options = {}) {
        const prisma = await getPrisma();
        const page = Math.max(1, Number(options.page || 1));
        const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 20)));
        const skip = (page - 1) * pageSize;
        const action = String(options.action || "").trim();
        const ruleVersionId = String(options.ruleVersionId || "").trim();
        const where = {};

        if (action) {
          where.action = action;
        }

        if (ruleVersionId) {
          where.ruleVersionId = ruleVersionId;
        }

        const [total, records] = await Promise.all([
          prisma.distributionRuleChangeLog.count({ where }),
          prisma.distributionRuleChangeLog.findMany({
            where,
            include: {
              ruleVersion: true
            },
            orderBy: {
              createdAt: "desc"
            },
            skip,
            take: pageSize
          })
        ]);

        return {
          list: records.map((item) => ({
            logId: item.id,
            action: item.action || "",
            summary: item.summary || "",
            payloadJson: item.payloadJson || "",
            actorId: item.actorId || "",
            actorName: item.actorName || "",
            createdAt: formatDateTime(item.createdAt),
            ruleVersion: item.ruleVersion
              ? {
                  versionId: item.ruleVersion.id || "",
                  versionNo: item.ruleVersion.versionNo || ""
                }
              : null
          })),
          page,
          pageSize,
          total
        };
      },
      async updateAdminDistributionRules(payload = {}, actor = {}) {
        const prisma = await getPrisma();
        const actorName = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";
        const actorId = String(actor.adminUserId || actor.id || "").trim();
        const published = await prisma.$transaction(async (tx) => {
          const baseRule = await tx.distributionRuleVersion.findFirst({
            where: {
              status: "published"
            },
            orderBy: [
              {
                publishedAt: "desc"
              },
              {
                createdAt: "desc"
              }
            ]
          }) || await tx.distributionRuleVersion.findFirst({
            orderBy: {
              createdAt: "desc"
            }
          });
          const normalized = normalizeRuleDraftPayload(payload, baseRule || {});

          await tx.distributionRuleVersion.updateMany({
            where: {
              status: "published"
            },
            data: {
              status: "archived"
            }
          });

          const nextVersion = await tx.distributionRuleVersion.create({
            data: {
              versionNo: buildDistributionRuleVersionNo(),
              ...normalized,
              status: "published",
              effectiveAt: new Date(),
              publishedAt: new Date(),
              publishedBy: actorName || null,
              createdBy: actorName || null
            }
          });

          await tx.distributionRuleChangeLog.create({
            data: {
              ruleVersionId: nextVersion.id,
              action: "legacy_put_publish",
              summary: "兼容旧接口直接发布规则",
              payloadJson: buildRuleLogPayload(nextVersion),
              actorId: actorId || null,
              actorName: actorName || null
            }
          });

          return nextVersion;
        });

        return mapDistributionRuleSummary(published);
      },
      async getAdminDistributors(options = {}) {
        const prisma = await getPrisma();
        const page = Math.max(1, Number(options.page || 1));
        const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 20)));
        const skip = (page - 1) * pageSize;
        const keyword = String(options.keyword || options.search || "").trim();
        const status = String(options.status || "").trim();
        const where = {};

        if (status) {
          where.status = normalizeDistributorProfileStatus(status, "active");
        }

        if (keyword) {
          where.user = {
            is: {
              OR: [
                {
                  nickname: {
                    contains: keyword
                  }
                },
                {
                  mobile: {
                    contains: keyword
                  }
                }
              ]
            }
          };
        }

        const [total, records] = await Promise.all([
          prisma.distributorProfile.count({ where }),
          prisma.distributorProfile.findMany({
            where,
            include: {
              user: true
            },
            orderBy: {
              createdAt: "desc"
            },
            skip,
            take: pageSize
          })
        ]);

        return {
          list: records.map((item) => mapAdminDistributorRecord(item)),
          page,
          pageSize,
          total
        };
      },
      async getAdminDistributorDetail(distributorId) {
        const prisma = await getPrisma();
        const record = await prisma.distributorProfile.findUnique({
          where: {
            id: distributorId
          },
          include: {
            user: true,
            commissionRecords: {
              orderBy: {
                createdAt: "desc"
              },
              take: 20
            }
          }
        });

        if (!record) {
          return null;
        }

        return {
          ...mapAdminDistributorRecord(record),
          settledCommissionCent: Math.round(toNumber(record.settledCommission) * 100),
          settledCommissionText: toNumber(record.settledCommission).toFixed(2),
          withdrawingCommissionCent: Math.round(toNumber(record.withdrawingCommission) * 100),
          withdrawingCommissionText: toNumber(record.withdrawingCommission).toFixed(2),
          withdrawableCommissionCent: Math.round(toNumber(record.withdrawableCommission) * 100),
          withdrawableCommissionText: toNumber(record.withdrawableCommission).toFixed(2),
          recentCommissionRecords: (record.commissionRecords || []).map((item) => ({
            commissionId: item.id,
            ruleVersionId: item.ruleVersionId || "",
            title: item.title || "",
            fromUser: item.fromUser || "",
            orderNo: item.orderNo || "",
            amountCent: Math.round(toNumber(item.amount) * 100),
            amountText: toNumber(item.amount).toFixed(2),
            status: item.status || "",
            statusText: getCommissionStatusText(item.status),
            createdAt: formatDateTime(item.createdAt)
          }))
        };
      },
      async updateAdminDistributorStatus(distributorId, status) {
        const prisma = await getPrisma();
        const nextStatus = normalizeDistributorProfileStatus(status, "inactive");
        const updated = await prisma.distributorProfile.update({
          where: {
            id: distributorId
          },
          data: {
            status: nextStatus
          },
          include: {
            user: true
          }
        }).catch(() => null);

        return updated ? mapAdminDistributorRecord(updated) : null;
      },
      async getWithdrawalRequests(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const { distributorProfile } = await getDistributorContext(prisma, user);
        const records = await buildUserWithdrawalList(prisma, distributorProfile.id);

        return {
          list: records,
          balance: {
            settledCommission: toNumber(distributorProfile.settledCommission),
            withdrawingCommission: toNumber(distributorProfile.withdrawingCommission),
            withdrawnCommission: toNumber(distributorProfile.withdrawnCommission),
            availableAmount: getWithdrawalAvailableAmount(distributorProfile)
          }
        };
      },
      async createWithdrawalRequest(sessionToken, payload = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const distributorProfile = await ensureDistributorFeatureData(prisma, user.id);
        const amount = parseAmount(payload.amount || (Number(payload.amountCent || 0) / 100));

        if (amount <= 0) {
          throw createStorefrontError("提现金额必须大于 0", 400, "WITHDRAWAL_AMOUNT_INVALID");
        }

        const serviceFee = Number(Math.max(0, parseAmount(payload.serviceFee || (Number(payload.serviceFeeCent || 0) / 100))).toFixed(2));

        if (serviceFee >= amount) {
          throw createStorefrontError("手续费不能大于等于提现金额", 400, "WITHDRAWAL_FEE_INVALID");
        }

        const availableAmount = getWithdrawalAvailableAmount(distributorProfile);

        if (amount > availableAmount) {
          throw createStorefrontError("可提现余额不足", 400, "WITHDRAWAL_BALANCE_INSUFFICIENT");
        }

        const channel = String(payload.channel || "manual_bank").trim() || "manual_bank";
        const accountName = String(payload.accountName || "").trim();
        const accountNoMask = maskAccountNo(payload.accountNo || payload.accountNoMask);
        const remark = String(payload.remark || "").trim();
        const netAmount = Number((amount - serviceFee).toFixed(2));

        const record = await prisma.$transaction(async (tx) => {
          const currentProfile = await tx.distributorProfile.findUnique({
            where: {
              id: distributorProfile.id
            }
          });

          if (!currentProfile) {
            throw createStorefrontError("分销员不存在", 404, "DISTRIBUTOR_NOT_FOUND");
          }

          const currentAvailableAmount = getWithdrawalAvailableAmount(currentProfile);

          if (amount > currentAvailableAmount) {
            throw createStorefrontError("可提现余额不足", 400, "WITHDRAWAL_BALANCE_INSUFFICIENT");
          }

          const currentWithdrawable = toNumber(currentProfile.withdrawableCommission);
          const created = await tx.withdrawalRequest.create({
            data: {
              requestNo: buildWithdrawalRequestNo(),
              distributorId: currentProfile.id,
              status: "submitted",
              amount,
              serviceFee,
              netAmount,
              channel,
              accountName: accountName || null,
              accountNoMask: accountNoMask || null,
              remark: remark || null
            },
            include: {
              payouts: {
                orderBy: {
                  createdAt: "desc"
                },
                take: 1
              }
            }
          });

          await tx.distributorProfile.update({
            where: {
              id: currentProfile.id
            },
            data: {
              withdrawingCommission: {
                increment: amount
              },
              withdrawableCommission: Number(Math.max(currentWithdrawable - amount, 0).toFixed(2))
            }
          });

          return created;
        });

        return mapWithdrawalRecord(record);
      },
      async getWithdrawalDetail(sessionToken, withdrawalId) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const record = await assertUserWithdrawalPermission(prisma, user.id, withdrawalId);

        if (!record) {
          return null;
        }

        return mapWithdrawalRecord(record, {
          withItems: true
        });
      },
      async cancelWithdrawalRequest(sessionToken, withdrawalId) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        return prisma.$transaction(async (tx) => {
          const record = await assertUserWithdrawalPermission(tx, user.id, withdrawalId);

          if (!record) {
            return null;
          }

          if (record.status !== "submitted") {
            if (record.status === "cancelled") {
              return mapWithdrawalRecord(record);
            }

            throw createStorefrontError("当前提现单状态不可撤销", 409, "WITHDRAWAL_CANCEL_NOT_ALLOWED");
          }

          const updated = await tx.withdrawalRequest.update({
            where: {
              id: record.id
            },
            data: {
              status: "cancelled",
              reviewRemark: "用户主动撤销"
            },
            include: {
              payouts: {
                orderBy: {
                  createdAt: "desc"
                },
                take: 1
              }
            }
          });

          await updateDistributorBalancesForRelease(tx, record.distributorId, toNumber(record.amount));

          return mapWithdrawalRecord(updated);
        });
      },
      async getAdminWithdrawalRequests(options = {}) {
        const prisma = await getPrisma();

        return buildAdminWithdrawalList(prisma, options);
      },
      async getAdminWithdrawalDetail(withdrawalId) {
        const prisma = await getPrisma();

        const record = await prisma.withdrawalRequest.findUnique({
          where: {
            id: withdrawalId
          },
          include: {
            distributor: {
              include: {
                user: true
              }
            },
            payouts: {
              orderBy: {
                createdAt: "desc"
              },
              take: 5
            },
            items: {
              include: {
                commissionRecord: true
              },
              orderBy: {
                createdAt: "desc"
              }
            }
          }
        });

        return record ? mapWithdrawalRecord(record, {
          withDistributor: true,
          withItems: true
        }) : null;
      },
      async reviewAdminWithdrawalRequest(withdrawalId, payload = {}, actor = {}) {
        const action = String(payload.action || "").trim();

        if (action !== "approve" && action !== "reject") {
          throw createStorefrontError("缺少有效审核动作", 400, "WITHDRAWAL_REVIEW_ACTION_REQUIRED");
        }

        const prisma = await getPrisma();

        const reviewer = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";
        const reviewRemark = String(payload.remark || "").trim();

        return prisma.$transaction(async (tx) => {
          const current = await tx.withdrawalRequest.findUnique({
            where: {
              id: withdrawalId
            },
            include: {
              distributor: {
                include: {
                  user: true
                }
              },
              payouts: {
                orderBy: {
                  createdAt: "desc"
                },
                take: 1
              }
            }
          });

          if (!current) {
            return null;
          }

          if (current.status !== "submitted") {
            if ((action === "approve" && current.status === "approved") || (action === "reject" && current.status === "rejected")) {
              return mapWithdrawalRecord(current, {
                withDistributor: true
              });
            }

            throw createStorefrontError("当前提现单状态不可审核", 409, "WITHDRAWAL_REVIEW_NOT_ALLOWED");
          }

          const nextStatus = action === "approve" ? "approved" : "rejected";
          const updated = await tx.withdrawalRequest.update({
            where: {
              id: current.id
            },
            data: {
              status: nextStatus,
              reviewRemark: reviewRemark || null,
              reviewedBy: reviewer,
              reviewedAt: new Date()
            },
            include: {
              distributor: {
                include: {
                  user: true
                }
              },
              payouts: {
                orderBy: {
                  createdAt: "desc"
                },
                take: 1
              }
            }
          });

          if (nextStatus === "rejected") {
            await updateDistributorBalancesForRelease(tx, current.distributorId, toNumber(current.amount));
          }

          return mapWithdrawalRecord(updated, {
            withDistributor: true
          });
        });
      },
      async payoutAdminWithdrawalRequest(withdrawalId, payload = {}, actor = {}) {
        const result = String(payload.result || "paid").trim() === "failed" ? "failed" : "paid";
        const channel = String(payload.channel || "manual_bank").trim() || "manual_bank";
        const channelBillNo = String(payload.channelBillNo || "").trim();
        const remark = String(payload.remark || "").trim();
        const paidBy = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";

        const prisma = await getPrisma();

        return prisma.$transaction(async (tx) => {
          const current = await tx.withdrawalRequest.findUnique({
            where: {
              id: withdrawalId
            },
            include: {
              distributor: {
                include: {
                  user: true
                }
              },
              payouts: {
                orderBy: {
                  createdAt: "desc"
                },
                take: 5
              }
            }
          });

          if (!current) {
            return null;
          }

          if (result === "paid" && current.status === "paid") {
            return mapWithdrawalRecord(current, {
              withDistributor: true
            });
          }

          if (!["approved", "paying", "pay_failed"].includes(current.status)) {
            throw createStorefrontError("当前提现单状态不可打款", 409, "WITHDRAWAL_PAYOUT_NOT_ALLOWED");
          }

          await tx.withdrawalPayout.create({
            data: {
              withdrawalRequestId: current.id,
              channel,
              channelBillNo: channelBillNo || null,
              status: result === "paid" ? "paid" : "failed",
              remark: remark || null,
              paidBy,
              paidAt: new Date()
            }
          });

          let updated = null;

          if (result === "paid") {
            await updateDistributorBalancesForPaid(tx, current.distributorId, toNumber(current.amount));
            updated = await tx.withdrawalRequest.update({
              where: {
                id: current.id
              },
              data: {
                status: "paid",
                paidAt: new Date()
              },
              include: {
                distributor: {
                  include: {
                    user: true
                  }
                },
                payouts: {
                  orderBy: {
                    createdAt: "desc"
                  },
                  take: 5
                }
              }
            });
          } else {
            updated = await tx.withdrawalRequest.update({
              where: {
                id: current.id
              },
              data: {
                status: "pay_failed"
              },
              include: {
                distributor: {
                  include: {
                    user: true
                  }
                },
                payouts: {
                  orderBy: {
                    createdAt: "desc"
                  },
                  take: 5
                }
              }
            });
          }

          return mapWithdrawalRecord(updated, {
            withDistributor: true
          });
        });
      }
    }
  };
}

module.exports = {
  createStorefrontPrismaDistributionModule
};
