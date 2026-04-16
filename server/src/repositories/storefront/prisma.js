const crypto = require("crypto");
const { getMockQuickEntries } = require("../../mock");
const { getPrismaClient } = require("../../lib/prisma");
const { exchangeMiniProgramCode, getWechatPhoneNumber } = require("../../lib/wechat-auth");
const { createStorefrontPrismaAdminRepository } = require("./prisma-admin");
const { createStorefrontPrismaCartModule } = require("./prisma-cart");
const { createStorefrontPrismaCatalogModule } = require("./prisma-catalog");
const { createStorefrontPrismaCouponModule } = require("./prisma-coupon");
const { createStorefrontPrismaDecorationModule } = require("./prisma-decoration");
const { createStorefrontPrismaDistributionModule } = require("./prisma-distribution");
const { createStorefrontPrismaMapperModule } = require("./prisma-mappers");
const { createStorefrontPrismaOrderModule } = require("./prisma-order");
const { createStorefrontPrismaProfileModule } = require("./prisma-profile");
const { createStorefrontPrismaSessionModule } = require("./prisma-session");
const {
  createStorefrontError,
  createUnauthorizedError
} = require("../../modules/storefront/errors");

const DEMO_OPEN_ID = "demo-openid";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const quickEntries = getMockQuickEntries();
const ACCENT_PALETTE = [
  "#F6D4C8",
  "#D7E7DE",
  "#E8DFC8",
  "#D8E0F0",
  "#F2D2DB",
  "#CFE2EA"
];
const DEFAULT_COUPON_TEMPLATES = [
  {
    code: "new_user_20",
    title: "新人立减 20",
    amount: 20,
    threshold: 99,
    badge: "新人",
    description: "首单满 99 可用",
    issueType: "center_claim",
    validDays: 7,
    status: "enabled",
    createdAt: new Date("2026-03-20T10:00:00+08:00"),
    updatedAt: new Date("2026-03-28T09:00:00+08:00")
  },
  {
    code: "order_199_minus_30",
    title: "满 199 减 30",
    amount: 30,
    threshold: 199,
    badge: "满减",
    description: "基础转化券",
    issueType: "manual_issue",
    validDays: 15,
    status: "enabled",
    createdAt: new Date("2026-03-21T10:00:00+08:00"),
    updatedAt: new Date("2026-03-28T09:10:00+08:00")
  },
  {
    code: "distribution_15",
    title: "分销专享券",
    amount: 15,
    threshold: 129,
    badge: "分销",
    description: "分享成交场景可用",
    issueType: "center_claim",
    validDays: 10,
    status: "enabled",
    createdAt: new Date("2026-03-22T10:00:00+08:00"),
    updatedAt: new Date("2026-03-28T09:15:00+08:00")
  }
];
const DEFAULT_GRANTED_COUPONS = [
  {
    templateCode: "new_user_20",
    sourceType: "system_grant",
    sourceText: "新客礼包",
    claimedAt: new Date("2026-03-24T10:00:00+08:00"),
    expiresAt: new Date("2026-04-30T23:59:59+08:00")
  },
  {
    templateCode: "order_199_minus_30",
    sourceType: "manual_issue",
    sourceText: "运营发放",
    claimedAt: new Date("2026-03-25T10:00:00+08:00"),
    expiresAt: new Date("2026-05-15T23:59:59+08:00")
  }
];
const DEFAULT_DISTRIBUTOR_PROFILE = {
  level: "普通分销员",
  totalCommission: 0,
  pendingCommission: 0,
  settledCommission: 0,
  teamCount: 0,
  todayInviteCount: 0,
  joinedAt: new Date("2026-03-30T09:00:00+08:00")
};

function buildSessionToken() {
  return `prisma_${crypto.randomBytes(24).toString("hex")}`;
}

function buildPublicOrderNo(date = new Date()) {
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

  const get = (type) => (parts.find((p) => p.type === type) || {}).value || "00";

  return [
    "NO",
    get("year"),
    get("month"),
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
    get("fractionalSecond").padEnd(3, "0")
  ].join("");
}

function normalizePageOptions(options = {}) {
  return {
    page: Math.max(1, Number(options.page || 1)),
    pageSize: Math.min(100, Math.max(1, Number(options.pageSize || 20)))
  };
}

function getPaginationQuery(options = {}) {
  const { page, pageSize } = normalizePageOptions(options);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize
  };
}

function buildPaginatedResult(list, total, options = {}) {
  const { page, pageSize } = normalizePageOptions(options);

  return {
    list,
    page,
    pageSize,
    total
  };
}

function createStorefrontPrismaRepository(clientFactory = getPrismaClient) {
  async function getPrisma() {
    return clientFactory();
  }

  // ── 基础设施层：DB 连接、错误构造 ──
  const coreCtx = { getPrisma, createStorefrontError, createUnauthorizedError };

  const mapperModule = createStorefrontPrismaMapperModule({
    accentPalette: ACCENT_PALETTE,
    createStorefrontError
  });
  const {
    assertUserOrderStatusTransition,
    buildCartPageData,
    buildCategoryRows,
    buildCheckoutSummary,
    buildCoverLabel,
    buildHighlightTags,
    formatDate,
    formatDateTime,
    formatMoney,
    getStatusText,
    mapAddress,
    mapAfterSale,
    mapCartItem,
    mapCouponTemplate,
    mapOrder,
    mapProduct,
    mapSession,
    mapUser,
    mapUserCoupon,
    toNumber
  } = mapperModule.helpers;

  const sessionModule = createStorefrontPrismaSessionModule({
    ...coreCtx,
    buildSessionToken,
    demoOpenId: DEMO_OPEN_ID,
    exchangeMiniProgramCode,
    mapSession,
    mapUser,
    sessionDurationMs: SESSION_DURATION_MS
  });

  const decorationModule = createStorefrontPrismaDecorationModule({ getPrisma });

  const catalogModule = createStorefrontPrismaCatalogModule({
    getBanners: decorationModule.methods.getBanners,
    getPageSections: decorationModule.methods.getPageSections,
    getStoreTheme: decorationModule.methods.getStoreTheme,
    quickEntries,
    buildCategoryRows,
    getPrisma,
    mapProduct
  });

  const cartModule = createStorefrontPrismaCartModule({
    ...coreCtx,
    buildCartPageData,
    getCurrentUserContext: sessionModule.helpers.getCurrentUserContext,
    mapAddress,
    toNumber
  });

  const couponModule = createStorefrontPrismaCouponModule({
    defaultCouponTemplates: DEFAULT_COUPON_TEMPLATES,
    defaultGrantedCoupons: DEFAULT_GRANTED_COUPONS,
    buildCheckoutSummary,
    ensureCart: cartModule.helpers.ensureCart,
    getCartItems: cartModule.helpers.getCartItems,
    getCartRecord: cartModule.helpers.getCartRecord,
    getCurrentUserContext: sessionModule.helpers.getCurrentUserContext,
    getSelectedAddress: cartModule.helpers.getSelectedAddress,
    mapAddress,
    mapCartItem,
    mapCouponTemplate,
    mapUserCoupon,
    toNumber
  });

  const distributionModule = createStorefrontPrismaDistributionModule({
    createStorefrontError,
    defaultDistributorProfile: DEFAULT_DISTRIBUTOR_PROFILE,
    buildCoverLabel,
    ensureCouponFeatureData: couponModule.helpers.ensureCouponFeatureData,
    formatDate,
    formatDateTime,
    getPrisma,
    getCurrentUserContext: sessionModule.helpers.getCurrentUserContext,
    getReferralBindingByInvitee: sessionModule.helpers.getReferralBindingByInvitee,
    mapUser: sessionModule.helpers.mapUser,
    mapUserCoupon,
    normalizeSourceScene: sessionModule.helpers.normalizeSourceScene,
    toNumber
  });

  const orderModule = createStorefrontPrismaOrderModule({
    assertUserOrderStatusTransition,
    buildPaginatedResult,
    buildCheckoutSummary,
    buildPublicOrderNo,
    couponHelpers: couponModule.helpers,
    createStorefrontError,
    distributionHelpers: distributionModule.helpers,
    formatDateTime,
    getPrisma,
    getPaginationQuery,
    getCartItems: cartModule.helpers.getCartItems,
    getCartRecord: cartModule.helpers.getCartRecord,
    getCurrentUserContext: sessionModule.helpers.getCurrentUserContext,
    getSelectedAddress: cartModule.helpers.getSelectedAddress,
    mapAfterSale,
    mapOrder,
    toNumber
  });

  const profileModule = createStorefrontPrismaProfileModule({
    cartHelpers: cartModule.helpers,
    couponHelpers: couponModule.helpers,
    distributionHelpers: distributionModule.helpers,
    getCurrentUserContext: sessionModule.helpers.getCurrentUserContext,
    getWechatPhoneNumber,
    mapAddress,
    mapUser: sessionModule.helpers.mapUser,
    mapUserCoupon
  });

  return {
    mode: "prisma",
    bootstrap() {
      return null;
    },
    ...sessionModule.methods,
    ...catalogModule.methods,
    ...cartModule.methods,
    ...couponModule.methods,
    ...orderModule.methods,
    ...profileModule.methods,
    ...distributionModule.methods,
    ...decorationModule.methods,
    ...createStorefrontPrismaAdminRepository({
      getPrisma,
      assertUserOrderStatusTransition,
      buildHighlightTags,
      buildPaginatedResult,
      formatDateTime,
      formatMoney,
      getPaginationQuery,
      getStatusText,
      restoreOrderStock: orderModule.helpers.restoreOrderStock,
      restoreUsedCouponForOrder: couponModule.helpers.restoreUsedCouponForOrder,
      toNumber
    })
  };
}

module.exports = {
  createStorefrontPrismaRepository
};
