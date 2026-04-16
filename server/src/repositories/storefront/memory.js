const crypto = require("crypto");
const {
  createStorefrontError,
  createUnauthorizedError
} = require("../../modules/storefront/errors");
const { ERROR_CODES } = require("../../../shared/error-codes");
const { formatDateTime } = require("../../../shared/utils");
const {
  resolveStorefrontSessionLoginType
} = require("./session-login");

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const sessionStore = new Map();
const sessionStates = new Map();

// 定期清理过期的用户会话和隔离状态
const memorySessionCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [token, record] of sessionStore) {
    if (record.expiresAt instanceof Date && record.expiresAt.getTime() <= now) {
      sessionStore.delete(token);
      sessionStates.delete(token);
    }
  }
}, 60 * 60 * 1000);
if (typeof memorySessionCleanupTimer.unref === "function") {
  memorySessionCleanupTimer.unref();
}

function buildSessionToken() {
  return `memory_${crypto.randomBytes(24).toString("hex")}`;
}

function toSessionData(record = {}, user = {}) {
  const payload = {
    sessionToken: record.sessionToken || "",
    expiresAt: record.expiresAt instanceof Date ? formatDateTime(record.expiresAt) : "",
    status: record.status || "active"
  };

  if (user && Object.keys(user).length) {
    payload.user = user;
  }

  return payload;
}

function getActiveSession(sessionToken) {
  const normalizedToken = String(sessionToken || "").trim();

  if (!normalizedToken) {
    return null;
  }

  const record = sessionStore.get(normalizedToken);

  if (!record) {
    return null;
  }

  if (!(record.expiresAt instanceof Date) || record.expiresAt.getTime() <= Date.now()) {
    sessionStore.delete(normalizedToken);
    return null;
  }

  return record;
}

function requireSession(sessionToken) {
  const record = getActiveSession(sessionToken);

  if (!record) {
    throw createUnauthorizedError();
  }

  return record;
}

function getDefaultMockSource() {
  return require("../../mock").createMockStorefrontSource();
}

function createStorefrontMemoryRepository(source = getDefaultMockSource()) {
  const supportsSessionStateIsolation =
    typeof source.dumpState === "function" &&
    typeof source.loadState === "function";

  function normalizeSourceError(error) {
    if (!error) {
      return createStorefrontError("服务异常", 500, "UNKNOWN_ERROR");
    }

    if (error.statusCode) {
      return error;
    }

    const message = String(error.message || "服务异常").trim();
    const code = String(error.code || "").trim();

    if (code && ERROR_CODES[code]) {
      return createStorefrontError(message, ERROR_CODES[code].statusCode, code);
    }

    return createStorefrontError(message, 500, code || "MEMORY_SOURCE_ERROR");
  }

  function runSource(callback) {
    try {
      return callback();
    } catch (error) {
      throw normalizeSourceError(error);
    }
  }

  function withSession(sessionToken, callback) {
    requireSession(sessionToken);

    if (!supportsSessionStateIsolation) {
      return runSource(callback);
    }

    if (!sessionStates.has(sessionToken)) {
      sessionStates.set(sessionToken, source.dumpState());
    }

    const savedState = sessionStates.get(sessionToken);
    source.loadState(savedState);

    try {
      return runSource(callback);
    } finally {
      sessionStates.set(sessionToken, source.dumpState());
    }
  }

  return {
    mode: "memory",
    bootstrap() {
      sessionStore.clear();
      sessionStates.clear();
      source.bootstrap();
    },
    // 公共只读接口：首页/分类/搜索/商品详情不依赖用户会话，
    // 所有用户共享同一份数据源，这是 demo 场景下的有意设计。
    // 管理员操作同样使用共享状态（runSource），以保证后台修改立即对所有用户可见。
    getHomeData() {
      return source.getHomeData();
    },
    getCategories() {
      return source.getCategories();
    },
    searchProducts(keyword) {
      return source.searchProducts(keyword);
    },
    getProductsByCategory(categoryId) {
      return source.getProductsByCategory(categoryId);
    },
    getProductDetail(productId) {
      return source.getProductDetail(productId);
    },
    createSession(payload = {}) {
      const loginType = resolveStorefrontSessionLoginType(payload, createStorefrontError);

      if (loginType === "wechat_miniprogram" && !String(payload.code || "").trim()) {
        throw createStorefrontError("缺少 wx.login 返回的 code，暂时无法继续微信登录", 400, "WECHAT_LOGIN_CODE_REQUIRED");
      }

      const record = {
        sessionToken: buildSessionToken(),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        status: "active"
      };

      sessionStore.set(record.sessionToken, record);
      if (supportsSessionStateIsolation) {
        sessionStates.set(record.sessionToken, source.dumpState());
      }

      return toSessionData(record, source.getUser());
    },
    getMe(sessionToken) {
      const session = requireSession(sessionToken);

      return {
        user: source.getUser(),
        session: toSessionData(session)
      };
    },
    logout(sessionToken) {
      const session = requireSession(sessionToken);

      sessionStore.delete(session.sessionToken);
      sessionStates.delete(session.sessionToken);

      return {
        ok: true
      };
    },
    getAddressListData(sessionToken) {
      return withSession(sessionToken, () => source.getAddressListData());
    },
    getAddressById(sessionToken, addressId) {
      return withSession(sessionToken, () => source.getAddressById(addressId));
    },
    createAddress(sessionToken, payload = {}) {
      return withSession(sessionToken, () => source.saveAddress(payload));
    },
    updateAddress(sessionToken, addressId, payload = {}) {
      return withSession(sessionToken, () => source.saveAddress({
        ...payload,
        id: addressId
      }));
    },
    deleteAddress(sessionToken, addressId) {
      return withSession(sessionToken, () => source.deleteAddress(addressId));
    },
    setSelectedAddress(sessionToken, addressId) {
      return withSession(sessionToken, () => source.setSelectedAddress(addressId));
    },
    getCartPageData(sessionToken) {
      return withSession(sessionToken, () => source.getCartPageData());
    },
    setCartItems(sessionToken, cartItems = []) {
      return withSession(sessionToken, () => source.setCartItems(cartItems));
    },
    addToCart(sessionToken, product = {}) {
      return withSession(sessionToken, () => source.addToCart(product));
    },
    increaseCartItem(sessionToken, productId, specText) {
      return withSession(sessionToken, () => source.increaseCartItem(productId, specText));
    },
    decreaseCartItem(sessionToken, productId, specText) {
      return withSession(sessionToken, () => source.decreaseCartItem(productId, specText));
    },
    removeCartItem(sessionToken, productId, specText) {
      return withSession(sessionToken, () => source.removeCartItem(productId, specText));
    },
    getCouponPageData(sessionToken) {
      return withSession(sessionToken, () => source.getCouponPageData());
    },
    claimCoupon(sessionToken, templateId) {
      return withSession(sessionToken, () => source.claimCoupon(templateId));
    },
    selectCoupon(sessionToken, couponId, amount) {
      return withSession(sessionToken, () => source.selectCoupon(couponId, amount));
    },
    clearSelectedCoupon(sessionToken) {
      return withSession(sessionToken, () => source.clearSelectedCoupon());
    },
    getCheckoutPageData(sessionToken) {
      return withSession(sessionToken, () => source.getCheckoutPageData());
    },
    submitOrder(sessionToken, payload = {}) {
      return withSession(sessionToken, () => source.submitOrder(payload));
    },
    prepareOrderPayment(sessionToken, orderId, payload = {}) {
      return withSession(sessionToken, () => source.prepareOrderPayment(orderId, payload));
    },
    getOrderPayment(sessionToken, orderId) {
      return withSession(sessionToken, () => source.getOrderPayment(orderId));
    },
    confirmMockOrderPayment(sessionToken, orderId, payload = {}) {
      return withSession(sessionToken, () => source.confirmMockOrderPayment(orderId, payload));
    },
    handleWechatPayNotify(payload = {}) {
      if (typeof source.handleWechatPayNotify !== "function") {
        return {
          ok: true,
          ignored: true
        };
      }

      return runSource(() => source.handleWechatPayNotify(payload));
    },
    getAllOrders(sessionToken, options = {}) {
      return withSession(sessionToken, () => source.getAllOrders(options));
    },
    getOrderDetail(sessionToken, orderId) {
      return withSession(sessionToken, () => source.getOrderDetailData(orderId));
    },
    updateOrderStatus(sessionToken, orderId, status) {
      return withSession(sessionToken, () => source.updateOrderStatus(orderId, status));
    },
    createAfterSale(payload = {}) {
      return withSession(payload.sessionToken, () => source.createAfterSale(payload));
    },
    getProfileData(sessionToken) {
      return withSession(sessionToken, () => source.getProfileData());
    },
    authorizeUser(sessionToken, payload = {}) {
      return withSession(sessionToken, () => source.authorizeUser(payload));
    },
    getDistributionData(sessionToken) {
      return withSession(sessionToken, () => source.getDistributionData());
    },
    getTeamData(sessionToken) {
      return withSession(sessionToken, () => source.getTeamData());
    },
    getCommissionData(sessionToken) {
      return withSession(sessionToken, () => source.getCommissionData());
    },
    getPosterData(sessionToken) {
      return withSession(sessionToken, () => source.getPosterData());
    },
    getWithdrawalRequests(sessionToken) {
      return withSession(sessionToken, () => source.getWithdrawalRequests());
    },
    createWithdrawalRequest(sessionToken, payload = {}) {
      return withSession(sessionToken, () => source.createWithdrawalRequest(payload));
    },
    getWithdrawalDetail(sessionToken, withdrawalId) {
      return withSession(sessionToken, () => source.getWithdrawalDetail(withdrawalId));
    },
    cancelWithdrawalRequest(sessionToken, withdrawalId) {
      return withSession(sessionToken, () => source.cancelWithdrawalRequest(withdrawalId));
    },
    getAdminCategories(options = {}) {
      return source.getAdminCategories(options);
    },
    saveAdminCategory(payload = {}) {
      return runSource(() => source.saveAdminCategory(payload));
    },
    deleteAdminCategory(categoryId) {
      return runSource(() => source.deleteAdminCategory(categoryId));
    },
    getAdminProducts(options = {}) {
      return source.getAdminProducts(options);
    },
    getAdminProductDetail(productId) {
      return source.getAdminProductDetail(productId);
    },
    saveAdminProduct(payload = {}) {
      return runSource(() => source.saveAdminProduct(payload));
    },
    updateAdminProductStatus(productId, status) {
      return runSource(() => source.updateAdminProductStatus(productId, status));
    },
    getAdminSkus(productId) {
      return source.getAdminSkus(productId);
    },
    saveAdminSkus(productId, payload = {}) {
      return runSource(() => source.saveAdminSkus(productId, payload));
    },
    updateAdminSkuStock(skuId, stock) {
      return runSource(() => source.updateAdminSkuStock(skuId, stock));
    },
    getAdminDashboardSummary() {
      return source.getAdminDashboardSummary();
    },
    getAdminOrders(options = {}) {
      return source.getAdminOrders(options);
    },
    getAdminOrderDetail(orderId) {
      return source.getAdminOrderDetail(orderId);
    },
    cancelAdminOrder(orderId) {
      return runSource(() => source.updateOrderStatus(orderId, "cancelled"));
    },
    getPendingShipmentOrders(options = {}) {
      return source.getPendingShipmentOrders(options);
    },
    shipAdminOrder(orderId, payload = {}) {
      return runSource(() => source.shipAdminOrder(orderId, payload));
    },
    getAdminAfterSales(options = {}) {
      return source.getAdminAfterSales(options);
    },
    reviewAdminAfterSale(afterSaleId, action, remark = "") {
      return runSource(() => source.reviewAdminAfterSale(afterSaleId, action, remark));
    },

    // ── 优惠券管理 ──

    getAdminCouponTemplates(options = {}) {
      return source.getAdminCouponTemplates(options);
    },
    saveAdminCouponTemplate(payload = {}) {
      return runSource(() => source.saveAdminCouponTemplate(payload));
    },
    updateAdminCouponTemplateStatus(templateId, status) {
      return runSource(() => source.updateAdminCouponTemplateStatus(templateId, status));
    },

    // ── 分销管理 ──

    getAdminDistributionRules() {
      return source.getAdminDistributionRules();
    },
    getAdminDistributionRuleVersions(options = {}) {
      return source.getAdminDistributionRuleVersions(options);
    },
    createAdminDistributionRuleVersion(payload = {}, actor = {}) {
      return runSource(() => source.createAdminDistributionRuleVersion(payload, actor));
    },
    publishAdminDistributionRuleVersion(ruleVersionId, payload = {}, actor = {}) {
      return runSource(() => source.publishAdminDistributionRuleVersion(ruleVersionId, payload, actor));
    },
    getAdminDistributionRuleChangeLogs(options = {}) {
      return source.getAdminDistributionRuleChangeLogs(options);
    },
    updateAdminDistributionRules(payload = {}, actor = {}) {
      return runSource(() => source.updateAdminDistributionRules(payload, actor));
    },
    getAdminDistributors(options = {}) {
      return source.getAdminDistributors(options);
    },
    getAdminDistributorDetail(distributorId) {
      return source.getAdminDistributorDetail(distributorId);
    },
    updateAdminDistributorStatus(distributorId, status) {
      return runSource(() => source.updateAdminDistributorStatus(distributorId, status));
    },
    getAdminWithdrawalRequests(options = {}) {
      return source.getAdminWithdrawalRequests(options);
    },
    getAdminWithdrawalDetail(withdrawalId) {
      return source.getAdminWithdrawalDetail(withdrawalId);
    },
    reviewAdminWithdrawalRequest(withdrawalId, payload = {}, actor = {}) {
      return runSource(() => source.reviewAdminWithdrawalRequest(withdrawalId, payload, actor));
    },
    payoutAdminWithdrawalRequest(withdrawalId, payload = {}, actor = {}) {
      return runSource(() => source.payoutAdminWithdrawalRequest(withdrawalId, payload, actor));
    },

    // ── 页面装修 / 主题 ──

    getAdminBanners() {
      return source.getAdminBanners();
    },
    saveBanner(payload = {}) {
      return runSource(() => source.saveAdminBanner(payload));
    },
    deleteBanner(bannerId) {
      return runSource(() => source.deleteAdminBanner(bannerId));
    },
    reorderBanners(items) {
      return runSource(() => source.reorderAdminBanners(items));
    },
    getPageSections() {
      return source.getAdminPageSections();
    },
    updatePageSection(sectionKey, payload = {}) {
      return runSource(() => source.saveAdminPageSection(sectionKey, payload));
    },
    reorderPageSections(items) {
      return runSource(() => source.reorderAdminPageSections(items));
    },
    getStoreTheme() {
      return source.getAdminStoreTheme();
    },
    updateStoreTheme(themeKey, value) {
      return runSource(() => source.saveAdminStoreTheme(themeKey, value));
    }
  };
}

module.exports = {
  createStorefrontMemoryRepository
};
