const crypto = require("crypto");
const mallService = require("../../../../miniprogram/services/mall");
const {
  createStorefrontError,
  createUnauthorizedError
} = require("../../modules/storefront/errors");

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const sessionStore = new Map();

function buildSessionToken() {
  return `memory_${crypto.randomBytes(24).toString("hex")}`;
}

function toSessionData(record = {}, user = {}) {
  const payload = {
    sessionToken: record.sessionToken || "",
    expiresAt: record.expiresAt instanceof Date ? record.expiresAt.toISOString() : "",
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

function resolveSessionLoginType(payload = {}) {
  const loginType = String(payload.loginType || "mock_wechat").trim().toLowerCase();

  if (loginType === "mock_wechat" || loginType === "wechat_miniprogram") {
    return loginType;
  }

  throw createStorefrontError("暂不支持当前登录方式", 400, "LOGIN_TYPE_UNSUPPORTED");
}

function createStorefrontMemoryRepository(source = mallService) {
  function withSession(sessionToken, callback) {
    requireSession(sessionToken);
    return callback();
  }

  return {
    mode: "memory",
    bootstrap() {
      source.bootstrap();
    },
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
      const loginType = resolveSessionLoginType(payload);

      if (loginType === "wechat_miniprogram" && !String(payload.code || "").trim()) {
        throw createStorefrontError("缺少 wx.login 返回的 code，暂时无法继续微信登录", 400, "WECHAT_LOGIN_CODE_REQUIRED");
      }

      const record = {
        sessionToken: buildSessionToken(),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        status: "active"
      };

      sessionStore.set(record.sessionToken, record);

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
    getAllOrders(sessionToken) {
      return withSession(sessionToken, () => source.getAllOrders());
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
    authorizeUser(sessionToken) {
      return withSession(sessionToken, () => source.authorizeUser());
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
      return source.updateOrderStatus(orderId, "cancelled");
    },
    getPendingShipmentOrders(options = {}) {
      return source.getPendingShipmentOrders(options);
    },
    shipAdminOrder(orderId, payload = {}) {
      return source.shipAdminOrder(orderId, payload);
    },
    getAdminAfterSales(options = {}) {
      return source.getAdminAfterSales(options);
    },
    reviewAdminAfterSale(afterSaleId, action, remark = "") {
      return source.reviewAdminAfterSale(afterSaleId, action, remark);
    }
  };
}

module.exports = {
  createStorefrontMemoryRepository
};
