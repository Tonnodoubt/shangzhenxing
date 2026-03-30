const crypto = require("crypto");
const { banners, quickEntries } = require("../../../../miniprogram/data/mock");
const { getPrismaClient } = require("../../lib/prisma");
const { exchangeMiniProgramCode } = require("../../lib/wechat-auth");
const {
  createStorefrontError,
  createUnauthorizedError
} = require("../../modules/storefront/errors");

const DEMO_OPEN_ID = "demo-openid";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
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
  level: "高级分销员",
  totalCommission: 368,
  pendingCommission: 129,
  settledCommission: 239,
  teamCount: 12,
  todayInviteCount: 3,
  joinedAt: new Date("2026-03-18T09:00:00+08:00")
};
const DEFAULT_TEAM_MEMBERS = [
  {
    nickname: "林小满",
    avatarLabel: "林",
    joinedAt: new Date("2026-03-24T00:00:00+08:00"),
    contributedAmount: 268
  },
  {
    nickname: "周星野",
    avatarLabel: "周",
    joinedAt: new Date("2026-03-22T00:00:00+08:00"),
    contributedAmount: 198
  },
  {
    nickname: "陈一诺",
    avatarLabel: "陈",
    joinedAt: new Date("2026-03-20T00:00:00+08:00"),
    contributedAmount: 129
  }
];
const DEFAULT_COMMISSION_RECORDS = [
  {
    title: "每日精选零食礼盒",
    fromUser: "林小满",
    orderNo: "NO20260326001",
    amount: 26,
    levelText: "一级佣金",
    status: "pending",
    createdAt: new Date("2026-03-26T15:22:00+08:00")
  },
  {
    title: "轻饮系列组合装",
    fromUser: "周星野",
    orderNo: "NO20260325002",
    amount: 18,
    levelText: "二级佣金",
    status: "settled",
    createdAt: new Date("2026-03-25T11:08:00+08:00")
  }
];

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function toNumber(value) {
  return Number(value || 0);
}

function buildSessionToken() {
  return `prisma_${crypto.randomBytes(24).toString("hex")}`;
}

function buildPublicOrderNo(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    "NO",
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    String(date.getMilliseconds()).padStart(3, "0")
  ].join("");
}

function formatDateTime(date) {
  const current = date ? new Date(date) : new Date();

  if (Number.isNaN(current.getTime())) {
    return "";
  }

  const pad = (value) => String(value).padStart(2, "0");

  return [
    current.getFullYear(),
    pad(current.getMonth() + 1),
    pad(current.getDate())
  ].join("-") + " " + [pad(current.getHours()), pad(current.getMinutes())].join(":");
}

function formatDate(date) {
  const current = date ? new Date(date) : new Date();

  if (Number.isNaN(current.getTime())) {
    return "";
  }

  const pad = (value) => String(value).padStart(2, "0");

  return [
    current.getFullYear(),
    pad(current.getMonth() + 1),
    pad(current.getDate())
  ].join("-");
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

function hashText(text = "") {
  return String(text).split("").reduce((sum, current) => sum + current.charCodeAt(0), 0);
}

function buildAccent(seed = "") {
  return ACCENT_PALETTE[hashText(seed) % ACCENT_PALETTE.length];
}

function buildCoverLabel(title = "") {
  const normalized = String(title || "").trim();

  return normalized.slice(0, 2) || "商品";
}

function buildHighlightTags(product = {}) {
  const source = [product.shortDesc, product.subTitle]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" / ");

  if (!source) {
    return ["支持下单", "支持多规格", "支持前台展示"];
  }

  return source
    .split(/[\/、，,。]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildCategoryRows(categories = []) {
  return [
    {
      id: "all",
      name: "全部"
    }
  ].concat((categories || []).map((item) => ({
    id: item.id,
    name: item.name
  })));
}

function getStatusText(status) {
  if (status === "pending") {
    return "待发货";
  }

  if (status === "shipping") {
    return "待收货";
  }

  if (status === "cancelled") {
    return "已取消";
  }

  return "已完成";
}

function getDisplayTextByStatus(status, textMap) {
  return textMap[status] || "未知状态";
}

function getPayStatus() {
  return "paid";
}

function getPayStatusText(status) {
  return getDisplayTextByStatus(status, {
    unpaid: "未支付",
    paid: "已支付",
    refunded: "已退款",
    part_refunded: "部分退款"
  });
}

function getAdminOrderStatus(order = {}) {
  return {
    pending: "pending_shipment",
    shipping: "shipping",
    done: "done",
    cancelled: "cancelled"
  }[order.status] || "pending_shipment";
}

function getAdminAfterSaleStatus(status) {
  return status === "processing" ? "pending_review" : status || "pending_review";
}

function getAdminAfterSaleStatusText(status) {
  return getDisplayTextByStatus(getAdminAfterSaleStatus(status), {
    pending_review: "待审核",
    approved: "已通过",
    rejected: "已驳回",
    done: "已完成"
  });
}

function getAftersaleStatusText(status) {
  const statusMap = {
    processing: "售后处理中",
    approved: "售后已通过",
    rejected: "售后已驳回",
    done: "售后已完成"
  };

  return statusMap[status] || "";
}

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

function getCouponDiscount(coupon, goodsAmount) {
  if (!coupon) {
    return 0;
  }

  const threshold = Number(coupon.threshold || 0);
  const amount = Number(coupon.amount || 0);
  const numericGoodsAmount = Number(goodsAmount || 0);

  if (numericGoodsAmount < threshold) {
    return 0;
  }

  return Math.min(amount, numericGoodsAmount);
}

function buildCheckoutSummary(cartItems = [], coupon = null) {
  const goodsAmountNumber = (cartItems || []).reduce((sum, item) => {
    return sum + toNumber(item.price) * Number(item.quantity || 0);
  }, 0);
  const totalCount = (cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const discountAmountNumber = getCouponDiscount(coupon, goodsAmountNumber);
  const payableAmountNumber = Math.max(goodsAmountNumber - discountAmountNumber, 0);

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

function mapUser(user = {}) {
  return {
    nickname: user.nickname || "微信用户",
    level: "普通会员",
    phone: user.mobile || "未授权手机号",
    isAuthorized: !!user.isAuthorized
  };
}

function mapSession(session = {}) {
  return {
    sessionToken: session.sessionToken || "",
    expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : "",
    status: session.status || "active"
  };
}

function resolveSessionLoginType(payload = {}) {
  const loginType = String(payload.loginType || "mock_wechat").trim().toLowerCase();

  if (loginType === "mock_wechat" || loginType === "wechat_miniprogram") {
    return loginType;
  }

  throw createStorefrontError("暂不支持当前登录方式", 400, "LOGIN_TYPE_UNSUPPORTED");
}

function mapAddress(address) {
  if (!address) {
    return null;
  }

  const detail = [
    address.province,
    address.city,
    address.district,
    address.detail
  ].filter(Boolean).join(" ");

  return {
    id: address.id,
    receiver: address.receiver,
    phone: address.phone,
    detail: detail || address.detail || "",
    tag: address.tag || "",
    isDefault: !!address.isDefault
  };
}

function mapProduct(product = {}) {
  const specs = (product.skus || [])
    .map((item) => item.specText)
    .filter(Boolean);
  const normalizedSpecs = specs.length ? specs : ["默认规格"];
  const price = toNumber(product.price);
  const marketPrice = toNumber(product.marketPrice);

  return {
    id: product.id,
    categoryId: product.categoryId || "",
    title: product.title,
    shortDesc: product.shortDesc || product.subTitle || "",
    subTitle: product.subTitle || product.shortDesc || "",
    price,
    marketPrice,
    displayPrice: formatMoney(price),
    displayMarketPrice: formatMoney(marketPrice),
    tag: product.status === "off_sale" ? "下架" : "在售",
    coverLabel: buildCoverLabel(product.title),
    accent: buildAccent(product.id),
    salesText: `月销 ${toNumber(product.salesCount)}`,
    salesCount: toNumber(product.salesCount),
    specs: normalizedSpecs,
    highlights: buildHighlightTags(product),
    favoriteCount: toNumber(product.favoriteCount),
    productType: "general",
    detailContent: product.detailContent || `<p>${product.shortDesc || product.title}</p>`,
    coverImage: product.coverImage || "",
    imageList: product.coverImage ? [product.coverImage] : [],
    distributionEnabled: typeof product.distributionEnabled === "boolean" ? product.distributionEnabled : true,
    status: product.status || "on_sale",
    statusText: product.status === "off_sale" ? "已下架" : "销售中"
  };
}

function mapCartItem(item = {}) {
  const price = toNumber(item.price);
  const quantity = Number(item.quantity || 0);
  const productId = item.productId || (item.product || {}).id || "";

  return {
    id: productId,
    title: item.title,
    price,
    quantity,
    specText: item.specText || "",
    coverLabel: buildCoverLabel(item.title),
    accent: buildAccent(productId || item.title),
    cartKey: `${productId}-${item.specText || ""}`,
    displayPrice: formatMoney(price),
    displaySubtotal: formatMoney(price * quantity)
  };
}

function buildCartPageData(cartItems = []) {
  const mappedItems = (cartItems || []).map((item) => mapCartItem(item));
  const totalCount = mappedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = mappedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

  return {
    cartItems: mappedItems,
    totalCount,
    totalPrice: formatMoney(totalPrice),
    isEmpty: mappedItems.length === 0
  };
}

function mapOrder(order = {}) {
  const amount = toNumber(order.payableAmount);
  const status = order.status || "pending";
  const aftersaleStatus = ((order.afterSale || {}).status) || "";

  return {
    id: order.orderNo,
    status,
    statusText: getStatusText(status),
    createTime: formatDateTime(order.createdAt),
    amount,
    goodsAmount: formatMoney(order.goodsAmount),
    discountAmount: formatMoney(order.discountAmount),
    displayAmount: formatMoney(order.payableAmount),
    couponTitle: order.couponTitle || "",
    remark: order.remark || "",
    address: mapAddress(order.address),
    items: (order.items || []).map((item) => {
      const subtotalAmount = toNumber(item.subtotalAmount);

      return {
        id: item.productId || "",
        skuId: item.skuId || "",
        title: item.title,
        price: toNumber(item.price),
        quantity: Number(item.quantity || 0),
        specText: item.specText || "",
        subtotalAmount,
        subtotal: formatMoney(subtotalAmount)
      };
    }),
    aftersaleStatus,
    aftersaleStatusText: getAftersaleStatusText(aftersaleStatus),
    canCancel: status === "pending",
    canConfirm: status === "shipping",
    canAftersale: status === "shipping" || status === "done"
  };
}

function mapCouponTemplate(template = {}, options = {}) {
  return {
    id: template.id,
    title: template.title,
    amount: toNumber(template.amount),
    threshold: toNumber(template.threshold),
    badge: template.badge || "",
    desc: template.description || "",
    expiryText: `领取后 ${Number(template.validDays || 0)} 天有效`,
    claimed: !!options.claimed,
    status: template.status || "enabled",
    issueType: template.issueType || "center_claim",
    validDays: Number(template.validDays || 0),
    receivedCount: Number(options.receivedCount || 0),
    usedCount: Number(options.usedCount || 0),
    createdAt: formatDateTime(template.createdAt),
    updatedAt: formatDateTime(template.updatedAt)
  };
}

function mapUserCoupon(coupon = {}) {
  const template = coupon.template || {};

  return {
    id: coupon.id,
    templateId: coupon.templateId || template.id || "",
    title: template.title || "",
    amount: toNumber(template.amount),
    threshold: toNumber(template.threshold),
    status: coupon.status || "available",
    expiryText: `${formatDate(coupon.expiresAt)} 前可用`,
    sourceText: coupon.sourceText || ""
  };
}

function mapAfterSale(record = {}) {
  return {
    id: record.id,
    orderId: record.orderId || "",
    reason: record.reason || "",
    description: record.description || "",
    status: record.status || "processing",
    statusText: getAftersaleStatusText(record.status),
    reviewRemark: record.reviewRemark || "",
    reviewedAt: formatDateTime(record.reviewedAt),
    reviewedBy: record.reviewedBy || "",
    createdAt: formatDateTime(record.createdAt)
  };
}

function buildReceiverAddress(address = {}) {
  if (!address) {
    return "";
  }

  return [
    address.province,
    address.city,
    address.district,
    address.detail
  ].filter(Boolean).join(" ").trim();
}

function mapAdminShipment(order = {}) {
  if (!order || !order.shippedAt) {
    return null;
  }

  const shippedAt = formatDateTime(order.shippedAt);

  return {
    id: `ship_${order.id}`,
    orderId: order.orderNo || "",
    companyCode: order.shipmentCompanyCode || "",
    companyName: order.shipmentCompanyName || "",
    trackingNo: order.shipmentTrackingNo || "",
    shippedAt,
    createdAt: shippedAt,
    updatedAt: formatDateTime(order.updatedAt) || shippedAt
  };
}

function buildAdminOrderListItem(order = {}) {
  const payStatus = getPayStatus(order);

  return {
    orderId: order.orderNo || "",
    orderNo: order.orderNo || "",
    userId: order.userId || "",
    buyerName: ((order.address || {}).receiver || (order.user || {}).nickname || "匿名用户"),
    orderStatus: getAdminOrderStatus(order),
    orderStatusText: getStatusText(order.status),
    payStatus,
    payStatusText: getPayStatusText(payStatus),
    payableAmountCent: Math.round(toNumber(order.payableAmount) * 100),
    payableAmountText: formatMoney(order.payableAmount),
    itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    sourceScene: "direct",
    createdAt: formatDateTime(order.createdAt),
    paidAt: formatDateTime(order.createdAt)
  };
}

function buildAdminAfterSaleDetail(record = {}, order = null) {
  const sourceOrder = order || record.order || {};

  return {
    afterSaleId: record.id,
    orderId: sourceOrder.orderNo || "",
    orderNo: sourceOrder.orderNo || "",
    userId: record.userId || sourceOrder.userId || "",
    buyerName: ((sourceOrder.address || {}).receiver || (record.user || {}).nickname || "匿名用户"),
    reason: record.reason || "",
    description: record.description || "",
    status: getAdminAfterSaleStatus(record.status),
    statusText: getAdminAfterSaleStatusText(record.status),
    reviewRemark: record.reviewRemark || "",
    reviewedAt: formatDateTime(record.reviewedAt),
    reviewedBy: record.reviewedBy || "",
    orderStatus: sourceOrder.status ? getAdminOrderStatus(sourceOrder) : "",
    orderStatusText: sourceOrder.status ? getStatusText(sourceOrder.status) : "",
    createdAt: formatDateTime(record.createdAt)
  };
}

function buildAdminOrderDetail(order = {}) {
  const payStatus = getPayStatus(order);
  const shipment = mapAdminShipment(order);

  return {
    orderId: order.orderNo || "",
    orderNo: order.orderNo || "",
    orderStatus: getAdminOrderStatus(order),
    orderStatusText: getStatusText(order.status),
    payStatus,
    payStatusText: getPayStatusText(payStatus),
    goodsAmountCent: Math.round(toNumber(order.goodsAmount) * 100),
    goodsAmountText: formatMoney(order.goodsAmount),
    discountAmountCent: Math.round(toNumber(order.discountAmount) * 100),
    discountAmountText: formatMoney(order.discountAmount),
    freightAmountCent: 0,
    freightAmountText: "0.00",
    payableAmountCent: Math.round(toNumber(order.payableAmount) * 100),
    payableAmountText: formatMoney(order.payableAmount),
    remark: order.remark || "",
    receiverName: (order.address || {}).receiver || "",
    receiverMobile: (order.address || {}).phone || "",
    receiverAddress: buildReceiverAddress(order.address || {}),
    items: (order.items || []).map((item, index) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const lineAmount = toNumber(item.subtotalAmount);

      return {
        orderItemId: item.id || `${order.id || order.orderNo || "order"}-${index + 1}`,
        productId: item.productId || "",
        productTitle: item.title,
        skuId: item.skuId || "",
        specText: item.specText || "",
        quantity,
        salePriceCent: Math.round((lineAmount / quantity) * 100),
        salePriceText: formatMoney(lineAmount / quantity)
      };
    }),
    shipment,
    afterSale: order.afterSale ? buildAdminAfterSaleDetail(order.afterSale, order) : null,
    createdAt: formatDateTime(order.createdAt),
    paidAt: formatDateTime(order.createdAt),
    shippedAt: shipment ? shipment.shippedAt : null
  };
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

function assertUserOrderStatusTransition(currentStatus, nextStatus) {
  if (!nextStatus) {
    throw createStorefrontError("缺少订单状态", 400, "ORDER_STATUS_REQUIRED");
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
    throw createStorefrontError("当前订单不能执行这个操作", 409, "ORDER_STATUS_TRANSITION_NOT_ALLOWED");
  }
}

async function ensureDemoUser(prisma) {
  return prisma.user.upsert({
    where: {
      openId: DEMO_OPEN_ID
    },
    update: {},
    create: {
      openId: DEMO_OPEN_ID,
      nickname: "微信用户",
      mobile: "未授权手机号",
      isAuthorized: false
    }
  });
}

async function getActiveSession(prisma, sessionToken) {
  const normalizedToken = String(sessionToken || "").trim();

  if (!normalizedToken) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: {
      sessionToken: normalizedToken
    },
    include: {
      user: true
    }
  });

  if (!session || session.status !== "active") {
    return null;
  }

  if (!(session.expiresAt instanceof Date) || session.expiresAt.getTime() <= Date.now()) {
    await prisma.userSession.update({
      where: {
        id: session.id
      },
      data: {
        status: "expired"
      }
    }).catch(() => null);

    return null;
  }

  return session;
}

async function requireCurrentAuth(prisma, sessionToken) {
  const session = await getActiveSession(prisma, sessionToken);

  if (!session) {
    throw createUnauthorizedError();
  }

  if (!session.user || session.user.status !== "active") {
    throw createUnauthorizedError("当前账号不可用，请重新登录");
  }

  return {
    session,
    user: session.user
  };
}

async function createDemoSession(prisma) {
  const user = await ensureDemoUser(prisma);
  return createSessionForUser(prisma, user);
}

async function createSessionForUser(prisma, user) {
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      sessionToken: buildSessionToken(),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      status: "active"
    }
  });

  return {
    sessionToken: session.sessionToken,
    expiresAt: mapSession(session).expiresAt,
    status: session.status,
    user: mapUser(user)
  };
}

async function ensureWechatUser(prisma, authPayload = {}) {
  const openId = String(authPayload.openId || "").trim();
  const unionId = String(authPayload.unionId || "").trim();

  if (!openId) {
    throw createStorefrontError("微信登录返回异常，缺少 openid", 502, "WECHAT_LOGIN_OPENID_MISSING");
  }

  const existingByOpenId = await prisma.user.findUnique({
    where: {
      openId
    }
  });

  if (existingByOpenId) {
    if (unionId && existingByOpenId.unionId !== unionId) {
      return prisma.user.update({
        where: {
          id: existingByOpenId.id
        },
        data: {
          unionId
        }
      });
    }

    return existingByOpenId;
  }

  if (unionId) {
    const existingByUnionId = await prisma.user.findUnique({
      where: {
        unionId
      }
    });

    if (existingByUnionId) {
      return prisma.user.update({
        where: {
          id: existingByUnionId.id
        },
        data: {
          openId
        }
      });
    }
  }

  return prisma.user.create({
    data: {
      openId,
      unionId: unionId || null,
      nickname: "微信用户",
      mobile: null,
      isAuthorized: false,
      status: "active"
    }
  });
}

async function getSelectedAddress(prisma, userId) {
  return prisma.address.findFirst({
    where: {
      userId
    },
    orderBy: [
      {
        isDefault: "desc"
      },
      {
        updatedAt: "desc"
      }
    ]
  });
}

async function getAddresses(prisma, userId) {
  return prisma.address.findMany({
    where: {
      userId
    },
    orderBy: [
      {
        isDefault: "desc"
      },
      {
        updatedAt: "desc"
      }
    ]
  });
}

async function ensureCart(prisma, userId) {
  return prisma.cart.upsert({
    where: {
      userId
    },
    update: {},
    create: {
      userId
    }
  });
}

async function getCartItems(prisma, userId) {
  const cart = await ensureCart(prisma, userId);

  return prisma.cartItem.findMany({
    where: {
      cartId: cart.id
    },
    orderBy: [
      {
        updatedAt: "desc"
      }
    ]
  });
}

async function getCartRecord(prisma, userId) {
  const cart = await ensureCart(prisma, userId);

  return prisma.cart.findUnique({
    where: {
      id: cart.id
    }
  });
}

async function syncExpiredCoupons(prisma, userId) {
  await prisma.userCoupon.updateMany({
    where: {
      userId,
      status: "available",
      expiresAt: {
        lte: new Date()
      }
    },
    data: {
      status: "expired"
    }
  });
}

async function ensureCouponTemplates(prisma) {
  for (const template of DEFAULT_COUPON_TEMPLATES) {
    await prisma.couponTemplate.upsert({
      where: {
        code: template.code
      },
      update: {
        title: template.title,
        amount: template.amount,
        threshold: template.threshold,
        badge: template.badge,
        description: template.description,
        issueType: template.issueType,
        validDays: template.validDays,
        status: template.status,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      },
      create: {
        code: template.code,
        title: template.title,
        amount: template.amount,
        threshold: template.threshold,
        badge: template.badge,
        description: template.description,
        issueType: template.issueType,
        validDays: template.validDays,
        status: template.status,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    });
  }
}

async function ensureUserCouponExperienceData(prisma, userId) {
  await ensureCouponTemplates(prisma);

  const templates = await prisma.couponTemplate.findMany({
    where: {
      code: {
        in: DEFAULT_GRANTED_COUPONS.map((item) => item.templateCode)
      }
    }
  });
  const templateByCode = new Map(templates.map((item) => [item.code, item]));

  for (const seed of DEFAULT_GRANTED_COUPONS) {
    const template = templateByCode.get(seed.templateCode);

    if (!template) {
      continue;
    }

    const existing = await prisma.userCoupon.findFirst({
      where: {
        userId,
        templateId: template.id,
        sourceType: seed.sourceType,
        sourceText: seed.sourceText
      }
    });

    if (existing) {
      continue;
    }

    await prisma.userCoupon.create({
      data: {
        userId,
        templateId: template.id,
        status: "available",
        sourceType: seed.sourceType,
        sourceText: seed.sourceText,
        claimedAt: seed.claimedAt,
        expiresAt: seed.expiresAt,
        createdAt: seed.claimedAt,
        updatedAt: seed.claimedAt
      }
    });
  }
}

async function ensureCouponFeatureData(prisma, userId) {
  await ensureUserCouponExperienceData(prisma, userId);
  await syncExpiredCoupons(prisma, userId);
}

async function ensureDistributorFeatureData(prisma, userId) {
  const profile = await prisma.distributorProfile.upsert({
    where: {
      userId
    },
    update: {},
    create: {
      userId,
      level: DEFAULT_DISTRIBUTOR_PROFILE.level,
      status: "active",
      totalCommission: DEFAULT_DISTRIBUTOR_PROFILE.totalCommission,
      pendingCommission: DEFAULT_DISTRIBUTOR_PROFILE.pendingCommission,
      settledCommission: DEFAULT_DISTRIBUTOR_PROFILE.settledCommission,
      teamCount: DEFAULT_DISTRIBUTOR_PROFILE.teamCount,
      todayInviteCount: DEFAULT_DISTRIBUTOR_PROFILE.todayInviteCount,
      joinedAt: DEFAULT_DISTRIBUTOR_PROFILE.joinedAt,
      createdAt: DEFAULT_DISTRIBUTOR_PROFILE.joinedAt,
      updatedAt: DEFAULT_DISTRIBUTOR_PROFILE.joinedAt
    }
  });

  const teamCount = await prisma.teamMember.count({
    where: {
      distributorId: profile.id
    }
  });

  if (!teamCount) {
    await prisma.teamMember.createMany({
      data: DEFAULT_TEAM_MEMBERS.map((item) => ({
        distributorId: profile.id,
        nickname: item.nickname,
        avatarLabel: item.avatarLabel,
        joinedAt: item.joinedAt,
        contributedAmount: item.contributedAmount,
        createdAt: item.joinedAt,
        updatedAt: item.joinedAt
      }))
    });
  }

  const commissionCount = await prisma.commissionRecord.count({
    where: {
      distributorId: profile.id
    }
  });

  if (!commissionCount) {
    await prisma.commissionRecord.createMany({
      data: DEFAULT_COMMISSION_RECORDS.map((item) => ({
        distributorId: profile.id,
        title: item.title,
        fromUser: item.fromUser,
        orderNo: item.orderNo,
        amount: item.amount,
        levelText: item.levelText,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.createdAt
      }))
    });
  }

  return prisma.distributorProfile.findUnique({
    where: {
      id: profile.id
    }
  });
}

async function findUserCouponById(prisma, userId, couponId) {
  const coupon = await prisma.userCoupon.findFirst({
    where: {
      id: couponId,
      userId
    },
    include: {
      template: true
    }
  });

  if (!coupon) {
    return null;
  }

  if (coupon.status === "available" && coupon.expiresAt instanceof Date && coupon.expiresAt.getTime() <= Date.now()) {
    await prisma.userCoupon.update({
      where: {
        id: coupon.id
      },
      data: {
        status: "expired"
      }
    });

    return {
      ...coupon,
      status: "expired"
    };
  }

  return coupon;
}

async function getSelectedCouponRecord(prisma, userId, cart) {
  if (!cart || !cart.selectedCouponId) {
    return null;
  }

  const coupon = await findUserCouponById(prisma, userId, cart.selectedCouponId);

  if (!coupon || coupon.status !== "available") {
    await prisma.cart.update({
      where: {
        id: cart.id
      },
      data: {
        selectedCouponId: null
      }
    }).catch(() => null);

    return null;
  }

  return coupon;
}

async function getOrderRecord(prisma, userId, orderNo) {
  return prisma.order.findFirst({
    where: {
      orderNo,
      userId
    },
    include: {
      address: true,
      afterSale: true,
      items: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });
}

async function syncPendingOrderLifecycle(prisma, userId) {
  return {
    prisma,
    userId
  };
}

async function restoreUsedCouponForOrder(prisma, orderId) {
  const usedCoupon = await prisma.userCoupon.findFirst({
    where: {
      usedOrderId: orderId
    }
  });

  if (!usedCoupon || usedCoupon.status !== "used") {
    return null;
  }

  return prisma.userCoupon.update({
    where: {
      id: usedCoupon.id
    },
    data: {
      status: "available",
      usedAt: null,
      usedOrderId: null
    }
  });
}

async function syncDistributionAfterOrderDone(prisma, user, order) {
  if (!order || !order.id) {
    return null;
  }

  const distributorProfile = await ensureDistributorFeatureData(prisma, user.id);

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
  const commissionBase = items.reduce((sum, item) => {
    if (item.product && item.product.distributionEnabled === false) {
      return sum;
    }

    return sum + toNumber(item.subtotalAmount);
  }, 0);
  const commissionAmount = Number(
    (commissionBase * getDistributorCommissionRate(distributorProfile || {})).toFixed(2)
  );

  if (commissionAmount <= 0) {
    return null;
  }

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

function createStorefrontPrismaRepository(clientFactory = getPrismaClient) {
  async function getPrisma() {
    return clientFactory();
  }

  async function getCurrentUserContext(sessionToken) {
    const prisma = await getPrisma();
    const auth = await requireCurrentAuth(prisma, sessionToken);

    return {
      prisma,
      user: auth.user,
      session: auth.session
    };
  }

  function buildAdminOrderWhere(options = {}) {
    const statusFilter = {
      pending_shipment: "pending",
      shipping: "shipping",
      done: "done",
      cancelled: "cancelled"
    }[String(options.status || "").trim()] || "";
    const orderNo = String(options.orderNo || "").trim();
    const where = {};

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (orderNo) {
      where.orderNo = {
        contains: orderNo
      };
    }

    return where;
  }

  function buildAdminAfterSaleWhere(options = {}) {
    const keyword = String(options.keyword || "").trim();
    const statusFilter = {
      pending_review: "processing",
      approved: "approved",
      rejected: "rejected",
      done: "done"
    }[String(options.status || "").trim()] || "";
    const where = {};

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (keyword) {
      where.OR = [
        {
          order: {
            is: {
              orderNo: {
                contains: keyword
              }
            }
          }
        },
        {
          user: {
            is: {
              nickname: {
                contains: keyword
              }
            }
          }
        },
        {
          order: {
            is: {
              address: {
                is: {
                  receiver: {
                    contains: keyword
                  }
                }
              }
            }
          }
        }
      ];
    }

    return where;
  }

  function assertAdminShipmentPayload(payload = {}) {
    if (!String(payload.companyName || "").trim()) {
      throw createStorefrontError("请先填写物流公司", 400, "SHIPMENT_COMPANY_NAME_REQUIRED");
    }

    if (!String(payload.trackingNo || "").trim()) {
      throw createStorefrontError("请先填写物流单号", 400, "SHIPMENT_TRACKING_NO_REQUIRED");
    }
  }

  function assertAdminShipmentAllowed(order) {
    if (!order) {
      return;
    }

    if (order.status !== "pending") {
      throw createStorefrontError("当前订单不可发货", 409, "ORDER_SHIPMENT_NOT_ALLOWED");
    }
  }

  return {
    mode: "prisma",
    bootstrap() {
      return null;
    },
    async createSession(payload = {}) {
      const prisma = await getPrisma();
      const loginType = resolveSessionLoginType(payload);

      if (loginType === "mock_wechat") {
        return createDemoSession(prisma);
      }

      const authPayload = await exchangeMiniProgramCode(payload.code);
      const user = await ensureWechatUser(prisma, authPayload);

      return createSessionForUser(prisma, user);
    },
    async getMe(sessionToken) {
      const { user, session } = await getCurrentUserContext(sessionToken);

      return {
        user: mapUser(user),
        session: mapSession(session)
      };
    },
    async logout(sessionToken) {
      const { prisma, session } = await getCurrentUserContext(sessionToken);

      await prisma.userSession.update({
        where: {
          id: session.id
        },
        data: {
          status: "revoked"
        }
      });

      return {
        ok: true
      };
    },
    async getHomeData() {
      const prisma = await getPrisma();
      const products = await prisma.product.findMany({
        where: {
          status: "on_sale"
        },
        include: {
          skus: {
            orderBy: {
              createdAt: "asc"
            }
          }
        },
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            createdAt: "desc"
          }
        ],
        take: 8
      });

      const mappedProducts = products.map((item) => mapProduct(item));

      return {
        banners,
        quickEntries,
        featuredProducts: mappedProducts.slice(0, 4),
        recommendedProducts: mappedProducts.slice(4, 8)
      };
    },
    async getCategories() {
      const prisma = await getPrisma();
      const categories = await prisma.category.findMany({
        where: {
          status: "enabled"
        },
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            createdAt: "asc"
          }
        ]
      });

      return buildCategoryRows(categories);
    },
    async searchProducts(keyword) {
      const prisma = await getPrisma();
      const normalizedKeyword = String(keyword || "").trim();

      if (!normalizedKeyword) {
        return [];
      }

      const products = await prisma.product.findMany({
        where: {
          status: "on_sale",
          OR: [
            {
              title: {
                contains: normalizedKeyword
              }
            },
            {
              shortDesc: {
                contains: normalizedKeyword
              }
            },
            {
              subTitle: {
                contains: normalizedKeyword
              }
            }
          ]
        },
        include: {
          skus: {
            orderBy: {
              createdAt: "asc"
            }
          }
        },
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            createdAt: "desc"
          }
        ]
      });

      return products.map((item) => mapProduct(item));
    },
    async getProductsByCategory(categoryId) {
      const prisma = await getPrisma();
      const where = {
        status: "on_sale"
      };

      if (categoryId && categoryId !== "all") {
        where.categoryId = categoryId;
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          skus: {
            orderBy: {
              createdAt: "asc"
            }
          }
        },
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            createdAt: "desc"
          }
        ]
      });

      return products.map((item) => mapProduct(item));
    },
    async getProductDetail(productId) {
      const prisma = await getPrisma();
      const product = await prisma.product.findUnique({
        where: {
          id: productId
        },
        include: {
          skus: {
            where: {
              status: "enabled"
            },
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      if (!product) {
        return null;
      }

      return mapProduct(product);
    },
    async getAddressListData(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const addresses = await getAddresses(prisma, user.id);
      const selectedAddress = addresses.find((item) => item.isDefault) || addresses[0] || null;

      return {
        addresses: addresses.map((item) => mapAddress(item)),
        selectedAddressId: selectedAddress ? selectedAddress.id : ""
      };
    },
    async getAddressById(sessionToken, addressId) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId: user.id
        }
      });

      return mapAddress(address);
    },
    async createAddress(sessionToken, payload = {}) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const currentAddresses = await getAddresses(prisma, user.id);
      const shouldSetDefault = !!payload.isDefault || currentAddresses.length === 0;

      const record = await prisma.$transaction(async (tx) => {
        if (shouldSetDefault) {
          await tx.address.updateMany({
            where: {
              userId: user.id
            },
            data: {
              isDefault: false
            }
          });
        }

        return tx.address.create({
          data: {
            userId: user.id,
            receiver: payload.receiver || "",
            phone: payload.phone || "",
            detail: payload.detail || "",
            tag: payload.tag || "",
            isDefault: shouldSetDefault
          }
        });
      });

      return mapAddress(record);
    },
    async updateAddress(sessionToken, addressId, payload = {}) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const current = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId: user.id
        }
      });

      if (!current) {
        return null;
      }

      const shouldSetDefault = typeof payload.isDefault === "boolean" ? payload.isDefault : current.isDefault;

      const record = await prisma.$transaction(async (tx) => {
        if (shouldSetDefault) {
          await tx.address.updateMany({
            where: {
              userId: user.id
            },
            data: {
              isDefault: false
            }
          });
        }

        return tx.address.update({
          where: {
            id: addressId
          },
          data: {
            receiver: payload.receiver || current.receiver,
            phone: payload.phone || current.phone,
            detail: payload.detail || current.detail,
            tag: Object.prototype.hasOwnProperty.call(payload, "tag") ? (payload.tag || "") : current.tag,
            isDefault: shouldSetDefault
          }
        });
      });

      return mapAddress(record);
    },
    async deleteAddress(sessionToken, addressId) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await prisma.$transaction(async (tx) => {
        await tx.address.deleteMany({
          where: {
            id: addressId,
            userId: user.id
          }
        });

        const nextDefault = await tx.address.findFirst({
          where: {
            userId: user.id
          },
          orderBy: {
            updatedAt: "desc"
          }
        });

        if (nextDefault) {
          await tx.address.updateMany({
            where: {
              userId: user.id
            },
            data: {
              isDefault: false
            }
          });

          await tx.address.update({
            where: {
              id: nextDefault.id
            },
            data: {
              isDefault: true
            }
          });
        }
      });

      return this.getAddressListData(sessionToken);
    },
    async setSelectedAddress(sessionToken, addressId) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: {
            userId: user.id
          },
          data: {
            isDefault: false
          }
        });

        await tx.address.updateMany({
          where: {
            id: addressId,
            userId: user.id
          },
          data: {
            isDefault: true
          }
        });
      });

      const selected = await getSelectedAddress(prisma, user.id);

      return mapAddress(selected);
    },
    async getCartPageData(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const cartItems = await getCartItems(prisma, user.id);

      return buildCartPageData(cartItems);
    },
    async setCartItems(sessionToken, cartItems = []) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const cart = await ensureCart(prisma, user.id);

      await prisma.$transaction(async (tx) => {
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id
          }
        });

        for (const item of cartItems) {
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: item.id,
              title: item.title || "",
              specText: item.specText || "",
              price: toNumber(item.price),
              quantity: Number(item.quantity || 1)
            }
          });
        }
      });

      return this.getCartPageData(sessionToken);
    },
    async addToCart(sessionToken, product = {}) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const cart = await ensureCart(prisma, user.id);
      const existing = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: product.id,
          specText: product.specText || ""
        }
      });

      if (existing) {
        await prisma.cartItem.update({
          where: {
            id: existing.id
          },
          data: {
            quantity: {
              increment: Number(product.quantity || 1)
            }
          }
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            title: product.title || "",
            specText: product.specText || "",
            price: toNumber(product.price),
            quantity: Number(product.quantity || 1)
          }
        });
      }

      return this.getCartPageData(sessionToken);
    },
    async increaseCartItem(sessionToken, productId, specText) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const cart = await ensureCart(prisma, user.id);
      const item = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
          specText: specText || ""
        }
      });

      if (item) {
        await prisma.cartItem.update({
          where: {
            id: item.id
          },
          data: {
            quantity: {
              increment: 1
            }
          }
        });
      }

      return this.getCartPageData(sessionToken);
    },
    async decreaseCartItem(sessionToken, productId, specText) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const cart = await ensureCart(prisma, user.id);
      const item = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
          specText: specText || ""
        }
      });

      if (item) {
        if (Number(item.quantity || 0) <= 1) {
          await prisma.cartItem.delete({
            where: {
              id: item.id
            }
          });
        } else {
          await prisma.cartItem.update({
            where: {
              id: item.id
            },
            data: {
              quantity: {
                decrement: 1
              }
            }
          });
        }
      }

      return this.getCartPageData(sessionToken);
    },
    async removeCartItem(sessionToken, productId, specText) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const cart = await ensureCart(prisma, user.id);

      await prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId,
          specText: specText || ""
        }
      });

      return this.getCartPageData(sessionToken);
    },
    async getCouponPageData(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await ensureCouponFeatureData(prisma, user.id);

      const cart = await getCartRecord(prisma, user.id);
      const selectedCoupon = await getSelectedCouponRecord(prisma, user.id, cart);
      const [templates, coupons] = await Promise.all([
        prisma.couponTemplate.findMany({
          where: {
            status: "enabled"
          },
          orderBy: [
            {
              createdAt: "asc"
            }
          ]
        }),
        prisma.userCoupon.findMany({
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
        })
      ]);
      const centerTemplates = [];

      for (const template of templates) {
        const [receivedCount, usedCount, claimedCount] = await Promise.all([
          prisma.userCoupon.count({
            where: {
              templateId: template.id
            }
          }),
          prisma.userCoupon.count({
            where: {
              templateId: template.id,
              status: "used"
            }
          }),
          prisma.userCoupon.count({
            where: {
              templateId: template.id,
              userId: user.id,
              sourceType: "center_claim"
            }
          })
        ]);

        centerTemplates.push(mapCouponTemplate(template, {
          receivedCount,
          usedCount,
          claimed: claimedCount > 0
        }));
      }

      return {
        centerTemplates,
        coupons: coupons.map((item) => mapUserCoupon(item)),
        selectedCouponId: selectedCoupon ? selectedCoupon.id : ""
      };
    },
    async claimCoupon(sessionToken, templateId) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await ensureCouponFeatureData(prisma, user.id);

      const template = await prisma.couponTemplate.findFirst({
        where: {
          id: templateId,
          status: "enabled"
        }
      });

      if (!template) {
        return {
          ok: false
        };
      }

      const existing = await prisma.userCoupon.findFirst({
        where: {
          userId: user.id,
          templateId: template.id,
          sourceType: "center_claim"
        }
      });

      if (existing) {
        return {
          ok: false
        };
      }

      const claimedAt = new Date();
      const coupon = await prisma.userCoupon.create({
        data: {
          userId: user.id,
          templateId: template.id,
          status: "available",
          sourceType: "center_claim",
          sourceText: "领券中心",
          claimedAt,
          expiresAt: new Date(claimedAt.getTime() + Number(template.validDays || 0) * 24 * 60 * 60 * 1000)
        },
        include: {
          template: true
        }
      });

      return {
        ok: true,
        coupon: mapUserCoupon(coupon)
      };
    },
    async selectCoupon(sessionToken, couponId, amount) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await ensureCouponFeatureData(prisma, user.id);

      const coupon = await findUserCouponById(prisma, user.id, couponId);

      if (!coupon) {
        return {
          ok: false,
          message: "这张券不存在了"
        };
      }

      if (coupon.status !== "available") {
        return {
          ok: false,
          message: "这张券当前不可用"
        };
      }

      if (Number(amount || 0) < toNumber((coupon.template || {}).threshold)) {
        return {
          ok: false,
          message: "当前金额还不能用这张券"
        };
      }

      const cart = await ensureCart(prisma, user.id);

      await prisma.cart.update({
        where: {
          id: cart.id
        },
        data: {
          selectedCouponId: coupon.id
        }
      });

      return {
        ok: true,
        coupon: mapUserCoupon(coupon)
      };
    },
    async clearSelectedCoupon(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const cart = await ensureCart(prisma, user.id);

      await prisma.cart.update({
        where: {
          id: cart.id
        },
        data: {
          selectedCouponId: null
        }
      });

      return {
        ok: true
      };
    },
    async getCheckoutPageData(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await ensureCouponFeatureData(prisma, user.id);

      const [cartItems, selectedAddress, cart] = await Promise.all([
        getCartItems(prisma, user.id),
        getSelectedAddress(prisma, user.id),
        getCartRecord(prisma, user.id)
      ]);
      const selectedCoupon = await getSelectedCouponRecord(prisma, user.id, cart);
      const checkoutSummary = buildCheckoutSummary(
        cartItems,
        selectedCoupon
          ? {
              amount: toNumber((selectedCoupon.template || {}).amount),
              threshold: toNumber((selectedCoupon.template || {}).threshold)
            }
          : null
      );

      return {
        address: mapAddress(selectedAddress),
        cartItems: cartItems.map((item) => mapCartItem(item)),
        totalCount: checkoutSummary.totalCount,
        goodsAmount: checkoutSummary.goodsAmount,
        discountAmount: checkoutSummary.discountAmount,
        payableAmount: checkoutSummary.payableAmount,
        goodsAmountNumber: checkoutSummary.goodsAmountNumber,
        selectedCoupon: selectedCoupon ? mapUserCoupon(selectedCoupon) : null
      };
    },
    async submitOrder(sessionToken, payload = {}) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await ensureCouponFeatureData(prisma, user.id);

      const cartItems = await getCartItems(prisma, user.id);

      if (!cartItems.length) {
        return {
          ok: false,
          message: "购物车为空"
        };
      }

      const selectedAddress = await getSelectedAddress(prisma, user.id);

      if (!selectedAddress) {
        return {
          ok: false,
          message: "请先选择地址"
        };
      }

      const orderNo = buildPublicOrderNo();
      const result = await prisma.$transaction(async (tx) => {
        const cart = await getCartRecord(tx, user.id);
        const currentCartItems = await getCartItems(tx, user.id);
        const currentAddress = await getSelectedAddress(tx, user.id);
        const selectedCoupon = await getSelectedCouponRecord(tx, user.id, cart);
        const checkoutSummary = buildCheckoutSummary(
          currentCartItems,
          selectedCoupon
            ? {
                amount: toNumber((selectedCoupon.template || {}).amount),
                threshold: toNumber((selectedCoupon.template || {}).threshold)
              }
            : null
        );
        const appliedCoupon = selectedCoupon && checkoutSummary.discountAmountNumber > 0
          ? selectedCoupon
          : null;

        const nextOrder = await tx.order.create({
          data: {
            orderNo,
            userId: user.id,
            addressId: currentAddress ? currentAddress.id : null,
            status: "pending",
            goodsAmount: checkoutSummary.goodsAmountNumber,
            discountAmount: checkoutSummary.discountAmountNumber,
            payableAmount: checkoutSummary.payableAmountNumber,
            couponTitle: appliedCoupon ? (appliedCoupon.template || {}).title || "" : null,
            remark: payload.remark || ""
          }
        });

        for (const item of currentCartItems) {
          await tx.orderItem.create({
            data: {
              orderId: nextOrder.id,
              productId: item.productId,
              skuId: item.skuId || null,
              title: item.title,
              specText: item.specText || "",
              price: toNumber(item.price),
              quantity: Number(item.quantity || 0),
              subtotalAmount: toNumber(item.price) * Number(item.quantity || 0)
            }
          });
        }

        if (appliedCoupon) {
          await tx.userCoupon.update({
            where: {
              id: appliedCoupon.id
            },
            data: {
              status: "used",
              usedAt: new Date(),
              usedOrderId: nextOrder.id
            }
          });
        }

        await tx.cart.update({
          where: {
            id: cart.id
          },
          data: {
            selectedCouponId: null
          }
        });

        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id
          }
        });

        const order = await tx.order.findUnique({
          where: {
            id: nextOrder.id
          },
          include: {
            address: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        return {
          ok: true,
          order: mapOrder(order)
        };
      });

      return result;
    },
    async getAllOrders(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await syncPendingOrderLifecycle(prisma, user.id);

      const orders = await prisma.order.findMany({
        where: {
          userId: user.id
        },
        include: {
          address: true,
          afterSale: true,
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return orders.map((item) => mapOrder(item));
    },
    async getOrderDetail(sessionToken, orderId) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await syncPendingOrderLifecycle(prisma, user.id);

      const order = await getOrderRecord(prisma, user.id, orderId);

      return {
        order: order ? mapOrder(order) : null,
        afterSale: order && order.afterSale ? mapAfterSale(order.afterSale) : null
      };
    },
    async updateOrderStatus(sessionToken, orderId, status) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.order.findFirst({
          where: {
            orderNo: orderId,
            userId: user.id
          },
          include: {
            address: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        if (!current) {
          return null;
        }

        assertUserOrderStatusTransition(current.status, status);

        if (current.status === status) {
          return current;
        }

        const nextOrder = await tx.order.update({
          where: {
            id: current.id
          },
          data: {
            status
          },
          include: {
            address: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        if (current.status === "pending" && status === "cancelled") {
          await restoreUsedCouponForOrder(tx, current.id);
        }

        if (current.status === "shipping" && status === "done") {
          await syncDistributionAfterOrderDone(tx, user, nextOrder);
        }

        return tx.order.findUnique({
          where: {
            id: current.id
          },
          include: {
            address: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });
      });

      return updated ? mapOrder(updated) : null;
    },
    async createAfterSale(payload = {}) {
      const { prisma, user } = await getCurrentUserContext(payload.sessionToken);

      await syncPendingOrderLifecycle(prisma, user.id);

      const order = await getOrderRecord(prisma, user.id, payload.orderId);

      if (!order) {
        throw createStorefrontError("订单不存在", 404, "ORDER_NOT_FOUND");
      }

      if (order.afterSale) {
        throw createStorefrontError("该订单已提交售后", 409, "AFTERSALE_ALREADY_EXISTS");
      }

      if (order.status !== "shipping" && order.status !== "done") {
        throw createStorefrontError("当前订单暂不可售后", 400, "AFTERSALE_NOT_ALLOWED");
      }

      const afterSale = await prisma.afterSale.create({
        data: {
          orderId: order.id,
          userId: user.id,
          reason: payload.reason || "不想要了",
          description: payload.description || "",
          status: "processing"
        }
      });

      return mapAfterSale(afterSale);
    },
    async getProfileData(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      await ensureCouponFeatureData(prisma, user.id);
      const distributorProfile = await ensureDistributorFeatureData(prisma, user.id);
      const [selectedAddress, coupons, cartItems, orderCount] = await Promise.all([
        getSelectedAddress(prisma, user.id),
        prisma.userCoupon.findMany({
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
        }),
        getCartItems(prisma, user.id),
        prisma.order.count({
          where: {
            userId: user.id
          }
        })
      ]);

      return {
        user: mapUser(user),
        address: mapAddress(selectedAddress) || {},
        coupons: coupons.map((item) => mapUserCoupon(item)),
        cartCount: cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        runtimeOrderCount: orderCount,
        distributor: mapDistributor(distributorProfile || {})
      };
    },
    async authorizeUser(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const updated = await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          nickname: "微信用户",
          mobile: "138****6699",
          isAuthorized: true
        }
      });

      return mapUser(updated);
    },
    async getDistributionData(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const distributorProfile = await ensureDistributorFeatureData(prisma, user.id);

      return {
        user: mapUser(user),
        distributor: mapDistributor(distributorProfile || {})
      };
    },
    async getTeamData(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const distributorProfile = await ensureDistributorFeatureData(prisma, user.id);
      const teamMembers = await prisma.teamMember.findMany({
        where: {
          distributorId: distributorProfile.id
        },
        orderBy: {
          joinedAt: "desc"
        }
      });

      return {
        teamMembers: teamMembers.map((item) => mapTeamMember(item)),
        distributor: mapDistributor(distributorProfile || {})
      };
    },
    async getCommissionData(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);
      const distributorProfile = await ensureDistributorFeatureData(prisma, user.id);
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
        distributor: mapDistributor(distributorProfile || {})
      };
    },
    async getPosterData(sessionToken) {
      const { prisma, user } = await getCurrentUserContext(sessionToken);

      await ensureCouponFeatureData(prisma, user.id);

      const distributorProfile = await ensureDistributorFeatureData(prisma, user.id);
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
        distributor: mapDistributor(distributorProfile || {}),
        coupon: posterCoupon ? mapUserCoupon(posterCoupon) : null
      };
    },
    async getAdminDashboardSummary() {
      const prisma = await getPrisma();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const [todayOrderCount, todayPaidAmount, newUserCount, newDistributorCount, pendingShipmentCount, shippingOrderCount, pendingAftersaleCount, processedAftersaleCount] = await Promise.all([
        prisma.order.count({
          where: {
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart
            }
          }
        }),
        prisma.order.aggregate({
          _sum: {
            payableAmount: true
          },
          where: {
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart
            },
            status: {
              not: "cancelled"
            }
          }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart
            }
          }
        }),
        prisma.distributorProfile.count({
          where: {
            joinedAt: {
              gte: todayStart,
              lt: tomorrowStart
            }
          }
        }),
        prisma.order.count({
          where: {
            status: "pending"
          }
        }),
        prisma.order.count({
          where: {
            status: "shipping"
          }
        }),
        prisma.afterSale.count({
          where: {
            status: "processing"
          }
        }),
        prisma.afterSale.count({
          where: {
            status: {
              in: ["approved", "rejected", "done"]
            }
          }
        })
      ]);

      return {
        todayOrderCount,
        todayPaidAmountCent: Math.round(toNumber((todayPaidAmount._sum || {}).payableAmount) * 100),
        todayPaidAmountText: formatMoney((todayPaidAmount._sum || {}).payableAmount),
        newUserCount,
        newDistributorCount,
        pendingShipmentCount,
        shippingOrderCount,
        pendingAftersaleCount,
        processedAftersaleCount
      };
    },
    async getAdminOrders(options = {}) {
      const prisma = await getPrisma();
      const where = buildAdminOrderWhere(options);
      const pagination = getPaginationQuery(options);
      const [total, orders] = await Promise.all([
        prisma.order.count({
          where
        }),
        prisma.order.findMany({
          where,
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          skip: pagination.skip,
          take: pagination.take
        })
      ]);

      return buildPaginatedResult(
        orders.map((item) => buildAdminOrderListItem(item)),
        total,
        options
      );
    },
    async getAdminOrderDetail(orderId) {
      const prisma = await getPrisma();
      const order = await prisma.order.findFirst({
        where: {
          orderNo: orderId
        },
        include: {
          address: true,
          user: true,
          afterSale: true,
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return order ? buildAdminOrderDetail(order) : null;
    },
    async cancelAdminOrder(orderId) {
      const prisma = await getPrisma();
      const order = await prisma.$transaction(async (tx) => {
        const current = await tx.order.findFirst({
          where: {
            orderNo: orderId
          },
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        if (!current) {
          return null;
        }

        assertUserOrderStatusTransition(current.status, "cancelled");

        const nextOrder = await tx.order.update({
          where: {
            id: current.id
          },
          data: {
            status: "cancelled"
          },
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        await restoreUsedCouponForOrder(tx, current.id);

        return nextOrder;
      });

      return order ? buildAdminOrderDetail(order) : null;
    },
    async getPendingShipmentOrders(options = {}) {
      const prisma = await getPrisma();
      const pagination = getPaginationQuery(options);
      const where = {
        status: "pending"
      };
      const [total, orders] = await Promise.all([
        prisma.order.count({
          where
        }),
        prisma.order.findMany({
          where,
          include: {
            address: true
          },
          orderBy: {
            createdAt: "desc"
          },
          skip: pagination.skip,
          take: pagination.take
        })
      ]);

      return buildPaginatedResult(
        orders.map((item) => ({
          orderId: item.orderNo,
          orderNo: item.orderNo,
          buyerName: (item.address || {}).receiver || "匿名用户",
          receiverName: (item.address || {}).receiver || "",
          receiverMobile: (item.address || {}).phone || "",
          receiverAddress: buildReceiverAddress(item.address || {}),
          payableAmountCent: Math.round(toNumber(item.payableAmount) * 100),
          payableAmountText: formatMoney(item.payableAmount),
          createdAt: formatDateTime(item.createdAt),
          paidAt: formatDateTime(item.createdAt)
        })),
        total,
        options
      );
    },
    async shipAdminOrder(orderId, payload = {}) {
      assertAdminShipmentPayload(payload);

      const prisma = await getPrisma();
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.order.findFirst({
          where: {
            orderNo: orderId
          },
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        if (!current) {
          return null;
        }

        assertAdminShipmentAllowed(current);

        return tx.order.update({
          where: {
            id: current.id
          },
          data: {
            status: "shipping",
            shipmentCompanyCode: payload.companyCode || null,
            shipmentCompanyName: payload.companyName,
            shipmentTrackingNo: payload.trackingNo,
            shippedAt: new Date()
          },
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });
      });

      if (!updated) {
        return null;
      }

      return {
        order: buildAdminOrderDetail(updated),
        shipment: mapAdminShipment(updated)
      };
    },
    async getAdminAfterSales(options = {}) {
      const prisma = await getPrisma();
      const where = buildAdminAfterSaleWhere(options);
      const pagination = getPaginationQuery(options);
      const [total, afterSales] = await Promise.all([
        prisma.afterSale.count({
          where
        }),
        prisma.afterSale.findMany({
          where,
          include: {
            user: true,
            order: {
              include: {
                address: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          skip: pagination.skip,
          take: pagination.take
        })
      ]);

      return buildPaginatedResult(
        afterSales.map((item) => buildAdminAfterSaleDetail(item)),
        total,
        options
      );
    },
    async reviewAdminAfterSale(afterSaleId, action, remark = "", actor = {}) {
      const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "";

      if (!nextStatus) {
        throw createStorefrontError("缺少有效的售后处理动作", 400, "AFTERSALE_ACTION_REQUIRED");
      }

      const prisma = await getPrisma();
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.afterSale.findUnique({
          where: {
            id: afterSaleId
          },
          include: {
            user: true,
            order: {
              include: {
                address: true
              }
            }
          }
        });

        if (!current) {
          return null;
        }

        if (current.status !== "processing") {
          if (current.status === nextStatus) {
            return current;
          }

          throw createStorefrontError("售后单已处理，请勿重复操作", 409, "AFTERSALE_ALREADY_REVIEWED");
        }

        return tx.afterSale.update({
          where: {
            id: current.id
          },
          data: {
            status: nextStatus,
            reviewRemark: remark || null,
            reviewedAt: new Date(),
            reviewedBy: String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员"
          },
          include: {
            user: true,
            order: {
              include: {
                address: true
              }
            }
          }
        });
      });

      return updated ? buildAdminAfterSaleDetail(updated) : null;
    }
  };
}

module.exports = {
  createStorefrontPrismaRepository
};
