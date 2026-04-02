const envConfig = require("../config/env");
const request = require("./request");
const sessionStore = require("./session");
const mockMallService = require("./mall");

let sessionBootstrapPromise = null;
let pendingInviteContext = null;

function shouldUseApi() {
  return envConfig.mallDataSource === "api";
}

function normalizeInviteContext(options = {}) {
  const query = options.query || {};
  const inviterUserId = String(query.inviterUserId || options.inviterUserId || "").trim();

  if (!inviterUserId) {
    return null;
  }

  return {
    inviterUserId,
    sourceScene: String(query.sourceScene || options.sourceScene || "").trim() || "share"
  };
}

function captureEntryContext(options = {}) {
  const nextContext = normalizeInviteContext(options);

  if (!nextContext) {
    return null;
  }

  pendingInviteContext = nextContext;

  return nextContext;
}

function bootstrap(options = {}) {
  captureEntryContext(options);

  if (!shouldUseApi()) {
    mockMallService.bootstrap();
    return;
  }

  ensureApiSession().catch((error) => {
    console.warn("[mall-session][bootstrap-fail]", error && error.message ? error.message : error);
  });
}

function isUnauthorizedError(error) {
  return !!(error && (Number(error.statusCode || 0) === 401 || error.code === "UNAUTHORIZED"));
}

function getSessionLoginMode() {
  const sessionLoginMode = String(envConfig.sessionLoginMode || "mock").trim().toLowerCase();

  if (sessionLoginMode === "wechat") {
    return "wechat";
  }

  return "mock";
}

function getSessionLoginModeSummary() {
  if (getSessionLoginMode() === "wechat") {
    return {
      mode: "wechat",
      tag: "微信登录准备态",
      title: "当前会优先走 wx.login",
      copy: "小程序会先拿微信 code，再交给后端换 openid 和 sessionToken。"
    };
  }

  return {
    mode: "mock",
    tag: "模拟登录态",
    title: "当前仍走 mock session",
    copy: "这样能继续稳定联调；等服务端配好微信密钥后，再切成真实微信登录。"
  };
}

function runWeChatLogin() {
  return new Promise((resolve, reject) => {
    if (typeof wx === "undefined" || typeof wx.login !== "function") {
      reject(new Error("当前环境暂不支持 wx.login，请先在微信小程序环境内调试"));
      return;
    }

    wx.login({
      success(result) {
        const code = String((result || {}).code || "").trim();

        if (!code) {
          reject(new Error("微信登录没有拿到有效 code，请重试"));
          return;
        }

        resolve(code);
      },
      fail(error) {
        reject(new Error((error && error.errMsg) || "wx.login 调用失败"));
      }
    });
  });
}

async function buildSessionCreatePayload() {
  const inviteContext = pendingInviteContext || {};

  if (getSessionLoginMode() === "wechat") {
    return {
      loginType: "wechat_miniprogram",
      code: await runWeChatLogin(),
      ...inviteContext
    };
  }

  return {
    loginType: "mock_wechat",
    ...inviteContext
  };
}

async function createApiSession() {
  const data = await request.post("/api/auth/session", await buildSessionCreatePayload(), {
    skipAuthorization: true
  });

  pendingInviteContext = null;
  sessionStore.setSession(data);

  return data;
}

async function ensureApiSession(options = {}) {
  if (!shouldUseApi()) {
    return null;
  }

  if (!options.forceRefresh && sessionStore.getSessionToken()) {
    return sessionStore.getSession();
  }

  if (!sessionBootstrapPromise) {
    sessionBootstrapPromise = createApiSession()
      .catch((error) => {
        sessionStore.clearSession();
        throw error;
      })
      .finally(() => {
        sessionBootstrapPromise = null;
      });
  }

  return sessionBootstrapPromise;
}

async function callApi(method, url, data, options = {}) {
  await ensureApiSession();

  try {
    return await request[method](url, data, options);
  } catch (error) {
    if (!isUnauthorizedError(error) || options.disableSessionRetry) {
      throw error;
    }

    sessionStore.clearSession();
    await ensureApiSession({
      forceRefresh: true
    });

    return request[method](url, data, {
      ...options,
      disableSessionRetry: true
    });
  }
}

function apiGet(url, data, options = {}) {
  return callApi("get", url, data, options);
}

function apiPost(url, data, options = {}) {
  return callApi("post", url, data, options);
}

function apiPut(url, data, options = {}) {
  return callApi("put", url, data, options);
}

function apiDelete(url, data, options = {}) {
  return callApi("del", url, data, options);
}

async function getAddresses() {
  if (!shouldUseApi()) {
    return mockMallService.getAddresses();
  }

  const data = await apiGet("/api/addresses");

  return data.addresses || [];
}

async function getAddressById(addressId) {
  if (!shouldUseApi()) {
    return mockMallService.getAddressById(addressId);
  }

  return apiGet(`/api/addresses/${addressId}`);
}

async function getAddressListData() {
  if (!shouldUseApi()) {
    return mockMallService.getAddressListData();
  }

  return apiGet("/api/addresses");
}

async function getSelectedAddress() {
  if (!shouldUseApi()) {
    return mockMallService.getSelectedAddress();
  }

  const data = await apiGet("/api/checkout");

  return data.address || null;
}

async function setSelectedAddress(addressId) {
  if (!shouldUseApi()) {
    return mockMallService.setSelectedAddress(addressId);
  }

  return apiPost(`/api/addresses/${addressId}/select`);
}

async function saveAddress(payload = {}) {
  if (!shouldUseApi()) {
    return mockMallService.saveAddress(payload);
  }

  if (payload.id) {
    return apiPut(`/api/addresses/${payload.id}`, payload);
  }

  return apiPost("/api/addresses", payload);
}

async function deleteAddress(addressId) {
  if (!shouldUseApi()) {
    return mockMallService.deleteAddress(addressId);
  }

  return apiDelete(`/api/addresses/${addressId}`);
}

async function getCartPageData() {
  if (!shouldUseApi()) {
    return mockMallService.getCartPageData();
  }

  return apiGet("/api/cart");
}

async function setCartItems(cartItems) {
  if (!shouldUseApi()) {
    return mockMallService.setCartItems(cartItems);
  }

  return apiPut("/api/cart", {
    cartItems
  });
}

async function addToCart(product) {
  if (!shouldUseApi()) {
    return mockMallService.addToCart(product);
  }

  return apiPost("/api/cart/items/add", {
    product
  });
}

async function increaseCartItem(id, specText) {
  if (!shouldUseApi()) {
    return mockMallService.increaseCartItem(id, specText);
  }

  return apiPost("/api/cart/items/increase", {
    id,
    specText
  });
}

async function decreaseCartItem(id, specText) {
  if (!shouldUseApi()) {
    return mockMallService.decreaseCartItem(id, specText);
  }

  return apiPost("/api/cart/items/decrease", {
    id,
    specText
  });
}

async function removeCartItem(id, specText) {
  if (!shouldUseApi()) {
    return mockMallService.removeCartItem(id, specText);
  }

  return apiPost("/api/cart/items/remove", {
    id,
    specText
  });
}

async function getCartCount() {
  if (!shouldUseApi()) {
    return mockMallService.getCartCount();
  }

  const data = await getCartPageData();

  return Number(data.totalCount || 0);
}

async function getCouponPageData() {
  if (!shouldUseApi()) {
    return mockMallService.getCouponPageData();
  }

  return apiGet("/api/coupons");
}

async function getSelectedCoupon() {
  if (!shouldUseApi()) {
    return mockMallService.getSelectedCoupon();
  }

  const data = await apiGet("/api/checkout");

  return data.selectedCoupon || null;
}

async function getAvailableCoupons(totalAmount) {
  if (!shouldUseApi()) {
    return mockMallService.getAvailableCoupons(totalAmount);
  }

  const data = await getCouponPageData();

  return (data.coupons || []).filter((item) => {
    return item.status === "available" && Number(totalAmount || 0) >= Number(item.threshold || 0);
  });
}

async function claimCoupon(templateId) {
  if (!shouldUseApi()) {
    return mockMallService.claimCoupon(templateId);
  }

  return apiPost("/api/coupons/claim", {
    templateId
  });
}

async function selectCoupon(couponId, amount) {
  if (!shouldUseApi()) {
    return mockMallService.selectCoupon(couponId, amount);
  }

  return apiPost("/api/coupons/select", {
    couponId,
    amount
  });
}

async function clearSelectedCoupon() {
  if (!shouldUseApi()) {
    return mockMallService.clearSelectedCoupon();
  }

  return apiPost("/api/coupons/clear");
}

async function getCheckoutPageData() {
  if (!shouldUseApi()) {
    return mockMallService.getCheckoutPageData();
  }

  return apiGet("/api/checkout");
}

async function submitOrder(options = {}) {
  if (!shouldUseApi()) {
    return mockMallService.submitOrder(options);
  }

  return apiPost("/api/orders/submit", options);
}

async function getAllOrders() {
  if (!shouldUseApi()) {
    return mockMallService.getAllOrders();
  }

  return apiGet("/api/orders");
}

async function getOrderById(orderId) {
  if (!shouldUseApi()) {
    return mockMallService.getOrderById(orderId);
  }

  const data = await apiGet(`/api/orders/${orderId}`);

  return data.order || null;
}

async function getOrderDetailData(orderId) {
  if (!shouldUseApi()) {
    return mockMallService.getOrderDetailData(orderId);
  }

  return apiGet(`/api/orders/${orderId}`);
}

async function updateOrderStatus(orderId, nextStatus) {
  if (!shouldUseApi()) {
    return mockMallService.updateOrderStatus(orderId, nextStatus);
  }

  return apiPost(`/api/orders/${orderId}/status`, {
    status: nextStatus
  });
}

async function createAfterSale(payload = {}) {
  if (!shouldUseApi()) {
    return mockMallService.createAfterSale(payload);
  }

  return apiPost(`/api/orders/${payload.orderId}/aftersale`, {
    reason: payload.reason,
    description: payload.description
  });
}

async function getUser() {
  if (!shouldUseApi()) {
    return mockMallService.getUser();
  }

  const data = await apiGet("/api/me");

  return data.user || {};
}

async function authorizeUser() {
  if (!shouldUseApi()) {
    return mockMallService.authorizeUser();
  }

  return apiPost("/api/auth/authorize");
}

async function logout() {
  if (!shouldUseApi()) {
    return {
      ok: true
    };
  }

  try {
    return await request.post("/api/auth/logout", {}, {
      disableSessionRetry: true
    });
  } finally {
    sessionStore.clearSession();
  }
}

async function getProfileData() {
  if (!shouldUseApi()) {
    return mockMallService.getProfileData();
  }

  return apiGet("/api/profile");
}

async function getDistributionData() {
  if (!shouldUseApi()) {
    return mockMallService.getDistributionData();
  }

  return apiGet("/api/distribution");
}

async function getTeamData() {
  if (!shouldUseApi()) {
    return mockMallService.getTeamData();
  }

  return apiGet("/api/team");
}

async function getCommissionData() {
  if (!shouldUseApi()) {
    return mockMallService.getCommissionData();
  }

  return apiGet("/api/commissions");
}

async function getPosterData() {
  if (!shouldUseApi()) {
    return mockMallService.getPosterData();
  }

  return apiGet("/api/poster");
}

module.exports = {
  bootstrap,
  captureEntryContext,
  getSessionLoginMode,
  getSessionLoginModeSummary,
  getAddresses,
  getAddressById,
  getAddressListData,
  getSelectedAddress,
  setSelectedAddress,
  saveAddress,
  deleteAddress,
  getCartPageData,
  setCartItems,
  addToCart,
  increaseCartItem,
  decreaseCartItem,
  removeCartItem,
  getCartCount,
  getCouponPageData,
  getSelectedCoupon,
  getAvailableCoupons,
  claimCoupon,
  selectCoupon,
  clearSelectedCoupon,
  getCheckoutPageData,
  submitOrder,
  getAllOrders,
  getOrderById,
  getOrderDetailData,
  updateOrderStatus,
  createAfterSale,
  getUser,
  authorizeUser,
  logout,
  getProfileData,
  getDistributionData,
  getTeamData,
  getCommissionData,
  getPosterData
};
