const envConfig = require("../config/env");
const request = require("./request");
const sessionStore = require("./session");
const mockMallService = require("../shared/mall-core");
const WECHAT_PROFILE_STORAGE_KEY = "wechat-mini-shop:wechat-profile";

let sessionBootstrapPromise = null;
let pendingInviteContext = null;

function shouldUseApi() {
  return envConfig.mallDataSource === "api";
}

// ── 数据源路由：消除 shouldUseApi() 重复分支 ──

function dispatch(mockMethod, apiFn) {
  if (!shouldUseApi()) {
    return mockMethod();
  }

  return apiFn();
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

  if (sessionStore.isLogoutLocked && sessionStore.isLogoutLocked()) {
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
    title: "当前使用模拟登录",
    copy: "可正常体验浏览和下单流程，完成微信登录配置后会自动切换。"
  };
}

function getDefaultLoginReadiness() {
  return {
    wechatMiniProgram: {
      enabled: getSessionLoginMode() === "wechat",
      configured: false
    },
    mockWechat: {
      enabled: true
    }
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

function getPendingInvitePayload() {
  return pendingInviteContext || {};
}

async function buildSessionCreatePayload() {
  const inviteContext = getPendingInvitePayload();

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

async function createApiSessionByPayload(payload = {}) {
  const data = await request.post("/api/v1/auth/session", payload, {
    skipAuthorization: true
  });

  pendingInviteContext = null;
  sessionStore.setSession(data);
  if (sessionStore.setLogoutLock) {
    sessionStore.setLogoutLock(false);
  }

  return data;
}

async function createApiSession() {
  return createApiSessionByPayload(await buildSessionCreatePayload());
}

async function ensureApiSession(options = {}) {
  if (!shouldUseApi()) {
    return null;
  }

  if (
    !options.forceRefresh
    && !sessionStore.getSessionToken()
    && sessionStore.isLogoutLocked
    && sessionStore.isLogoutLocked()
  ) {
    const error = new Error("请先登录");
    error.code = "LOGGED_OUT";
    throw error;
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

async function refreshSession(options = {}) {
  if (!shouldUseApi()) {
    mockMallService.bootstrap();
    return null;
  }

  if (options.clearStoredSession !== false) {
    sessionStore.clearSession();
  }

  if (sessionStore.setLogoutLock) {
    sessionStore.setLogoutLock(false);
  }

  return ensureApiSession({
    forceRefresh: true
  });
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

function runWxRequestPayment(params = {}) {
  return new Promise((resolve, reject) => {
    if (typeof wx === "undefined" || typeof wx.requestPayment !== "function") {
      reject(new Error("当前环境暂不支持微信支付调起"));
      return;
    }

    wx.requestPayment({
      timeStamp: String(params.timeStamp || ""),
      nonceStr: String(params.nonceStr || ""),
      package: String(params.package || ""),
      signType: String(params.signType || "RSA"),
      paySign: String(params.paySign || ""),
      success: resolve,
      fail: (error) => {
        const message = String((error || {}).errMsg || "").trim();

        if (message.includes("cancel")) {
          reject(new Error("你已取消支付"));
          return;
        }

        reject(new Error(message || "支付调起失败"));
      }
    });
  });
}

function getLoginReadiness() {
  return dispatch(
    () => Promise.resolve(getDefaultLoginReadiness()),
    () => request.get("/api/v1/auth/login-readiness", {}, {
      skipAuthorization: true
    })
  );
}

function normalizeOrderPageData(payload) {
  if (Array.isArray(payload)) {
    return {
      list: payload,
      page: 1,
      pageSize: payload.length || 20,
      total: payload.length
    };
  }

  return {
    list: Array.isArray((payload || {}).list) ? payload.list : [],
    page: Math.max(1, Number((payload || {}).page || 1)),
    pageSize: Math.max(1, Number((payload || {}).pageSize || 20)),
    total: Math.max(0, Number((payload || {}).total || 0))
  };
}

// ── 地址 ──

function getAddresses() {
  return dispatch(
    () => mockMallService.getAddresses(),
    async () => {
      const data = await apiGet("/api/v1/addresses");
      return data.addresses || [];
    }
  );
}

function getAddressById(addressId) {
  return dispatch(
    () => mockMallService.getAddressById(addressId),
    () => apiGet(`/api/addresses/${addressId}`)
  );
}

function getAddressListData() {
  return dispatch(
    () => mockMallService.getAddressListData(),
    () => apiGet("/api/v1/addresses")
  );
}

function getSelectedAddress() {
  return dispatch(
    () => mockMallService.getSelectedAddress(),
    async () => {
      const data = await apiGet("/api/v1/checkout");
      return data.address || null;
    }
  );
}

function setSelectedAddress(addressId) {
  return dispatch(
    () => mockMallService.setSelectedAddress(addressId),
    () => apiPost(`/api/addresses/${addressId}/select`)
  );
}

function saveAddress(payload = {}) {
  return dispatch(
    () => mockMallService.saveAddress(payload),
    () => payload.id
      ? apiPut(`/api/addresses/${payload.id}`, payload)
      : apiPost("/api/v1/addresses", payload)
  );
}

function deleteAddress(addressId) {
  return dispatch(
    () => mockMallService.deleteAddress(addressId),
    () => apiDelete(`/api/addresses/${addressId}`)
  );
}

// ── 购物车 ──

function getCartPageData() {
  return dispatch(
    () => mockMallService.getCartPageData(),
    () => apiGet("/api/v1/cart")
  );
}

function setCartItems(cartItems) {
  return dispatch(
    () => mockMallService.setCartItems(cartItems),
    () => apiPut("/api/v1/cart", { cartItems })
  );
}

function addToCart(product) {
  return dispatch(
    () => mockMallService.addToCart(product),
    () => apiPost("/api/v1/cart/items/add", { product })
  );
}

function increaseCartItem(id, specText) {
  return dispatch(
    () => mockMallService.increaseCartItem(id, specText),
    () => apiPost("/api/v1/cart/items/increase", { id, specText })
  );
}

function decreaseCartItem(id, specText) {
  return dispatch(
    () => mockMallService.decreaseCartItem(id, specText),
    () => apiPost("/api/v1/cart/items/decrease", { id, specText })
  );
}

function removeCartItem(id, specText) {
  return dispatch(
    () => mockMallService.removeCartItem(id, specText),
    () => apiPost("/api/v1/cart/items/remove", { id, specText })
  );
}

function getCartCount() {
  return dispatch(
    () => mockMallService.getCartCount(),
    async () => {
      const data = await getCartPageData();
      return Number(data.totalCount || 0);
    }
  );
}

// ── 优惠券 ──

function getCouponPageData() {
  return dispatch(
    () => mockMallService.getCouponPageData(),
    () => apiGet("/api/v1/coupons")
  );
}

function getSelectedCoupon() {
  return dispatch(
    () => mockMallService.getSelectedCoupon(),
    async () => {
      const data = await apiGet("/api/v1/checkout");
      return data.selectedCoupon || null;
    }
  );
}

function getAvailableCoupons(totalAmount) {
  return dispatch(
    () => mockMallService.getAvailableCoupons(totalAmount),
    async () => {
      const data = await getCouponPageData();
      return (data.coupons || []).filter((item) => {
        return item.status === "available" && Number(totalAmount || 0) >= Number(item.threshold || 0);
      });
    }
  );
}

function claimCoupon(templateId) {
  return dispatch(
    () => mockMallService.claimCoupon(templateId),
    () => apiPost("/api/v1/coupons/claim", { templateId })
  );
}

function selectCoupon(couponId, amount) {
  return dispatch(
    () => mockMallService.selectCoupon(couponId, amount),
    () => apiPost("/api/v1/coupons/select", { couponId, amount })
  );
}

function clearSelectedCoupon() {
  return dispatch(
    () => mockMallService.clearSelectedCoupon(),
    () => apiPost("/api/v1/coupons/clear")
  );
}

// ── 结算 / 订单 ──

function getCheckoutPageData() {
  return dispatch(
    () => mockMallService.getCheckoutPageData(),
    () => apiGet("/api/v1/checkout")
  );
}

function submitOrder(options = {}) {
  return dispatch(
    () => mockMallService.submitOrder(options),
    () => apiPost("/api/v1/orders/submit", options)
  );
}

function prepareOrderPayment(orderId, payload = {}) {
  return dispatch(
    () => mockMallService.prepareOrderPayment(orderId, payload),
    () => apiPost(`/api/v1/orders/${orderId}/payment/prepare`, payload)
  );
}

function getOrderPayment(orderId) {
  return dispatch(
    () => mockMallService.getOrderPayment(orderId),
    () => apiGet(`/api/v1/orders/${orderId}/payment`)
  );
}

function confirmMockOrderPayment(orderId, payload = {}) {
  return dispatch(
    () => mockMallService.confirmMockOrderPayment(orderId, payload),
    () => apiPost(`/api/v1/orders/${orderId}/payment/mock-confirm`, payload)
  );
}

async function payOrder(orderId, payload = {}) {
  const prepared = await prepareOrderPayment(orderId, payload);

  if (!prepared) {
    return {
      ok: false,
      message: "订单不存在"
    };
  }

  if (prepared.status === "paid") {
    return {
      ok: true,
      mode: prepared.provider || "mock",
      payment: prepared
    };
  }

  if (prepared.mockFlow) {
    const confirmed = await confirmMockOrderPayment(orderId, {
      mockToken: prepared.mockToken,
      scene: String(payload.scene || "checkout").trim() || "checkout"
    });

    return {
      ok: true,
      mode: "mock",
      payment: confirmed
    };
  }

  if (!prepared.requestPayment) {
    throw new Error("当前支付能力尚未配置完成");
  }

  await runWxRequestPayment(prepared.requestPayment);
  const payment = await getOrderPayment(orderId);

  if (payment && payment.status !== "paid") {
    return {
      ok: true,
      mode: prepared.provider || "wechat_jsapi",
      pendingConfirmation: true,
      payment
    };
  }

  return {
    ok: true,
    mode: prepared.provider || "wechat_jsapi",
    payment
  };
}

function getAllOrders(options = {}) {
  return dispatch(
    () => normalizeOrderPageData(mockMallService.getAllOrders(options)),
    async () => normalizeOrderPageData(await apiGet("/api/v1/orders", options))
  );
}

function getOrderById(orderId) {
  return dispatch(
    () => mockMallService.getOrderById(orderId),
    async () => {
      const data = await apiGet(`/api/orders/${orderId}`);
      return data.order || null;
    }
  );
}

function getOrderDetailData(orderId) {
  return dispatch(
    () => mockMallService.getOrderDetailData(orderId),
    () => apiGet(`/api/orders/${orderId}`)
  );
}

function updateOrderStatus(orderId, nextStatus) {
  return dispatch(
    () => mockMallService.updateOrderStatus(orderId, nextStatus),
    () => apiPost(`/api/orders/${orderId}/status`, { status: nextStatus })
  );
}

function createAfterSale(payload = {}) {
  return dispatch(
    () => mockMallService.createAfterSale(payload),
    () => apiPost(`/api/orders/${payload.orderId}/aftersale`, {
      reason: payload.reason,
      description: payload.description
    })
  );
}

// ── 用户 / 个人中心 ──

function getUser() {
  return dispatch(
    () => mockMallService.getUser(),
    async () => {
      try {
        const data = await apiGet("/api/v1/me");
        return data.user || {};
      } catch (error) {
        if (error && error.code === "LOGGED_OUT") {
          return {
            id: "",
            nickname: "",
            phone: "",
            isAuthorized: false
          };
        }

        throw error;
      }
    }
  );
}

function authorizeUser(payload = {}) {
  return dispatch(
    () => mockMallService.authorizeUser(payload),
    () => apiPost("/api/v1/auth/authorize", payload || {})
  );
}

async function logout() {
  if (!shouldUseApi()) {
    if (sessionStore.setLogoutLock) {
      sessionStore.setLogoutLock(true);
    }
    try {
      wx.removeStorageSync(WECHAT_PROFILE_STORAGE_KEY);
    } catch (error) {
      console.warn("[mall-session][clear-wechat-profile-fail]", error && error.message ? error.message : error);
    }
    return { ok: true };
  }

  try {
    return await request.post("/api/v1/auth/logout", {}, {
      disableSessionRetry: true
    });
  } finally {
    sessionStore.clearSession();
    if (sessionStore.setLogoutLock) {
      sessionStore.setLogoutLock(true);
    }
    try {
      wx.removeStorageSync(WECHAT_PROFILE_STORAGE_KEY);
    } catch (error) {
      console.warn("[mall-session][clear-wechat-profile-fail]", error && error.message ? error.message : error);
    }
  }
}

function getProfileData() {
  return dispatch(
    () => mockMallService.getProfileData(),
    async () => {
      try {
        return await apiGet("/api/v1/profile");
      } catch (error) {
        if (error && error.code === "LOGGED_OUT") {
          return {
            user: {
              id: "",
              nickname: "",
              phone: "",
              isAuthorized: false
            },
            address: {},
            coupons: [],
            distributor: {
              pendingCommission: 0,
              totalCommission: 0,
              todayIncome: 0,
              todayCommission: 0,
              todayEarning: 0
            }
          };
        }

        throw error;
      }
    }
  );
}

// ── 分销 ──

function getDistributionData() {
  return dispatch(
    () => mockMallService.getDistributionData(),
    () => apiGet("/api/v1/distribution")
  );
}

function getTeamData() {
  return dispatch(
    () => mockMallService.getTeamData(),
    () => apiGet("/api/v1/team")
  );
}

function getCommissionData() {
  return dispatch(
    () => mockMallService.getCommissionData(),
    () => apiGet("/api/v1/commissions")
  );
}

function getPosterData() {
  return dispatch(
    () => mockMallService.getPosterData(),
    () => apiGet("/api/v1/poster")
  );
}

module.exports = {
  bootstrap,
  captureEntryContext,
  refreshSession,
  getLoginReadiness,
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
  prepareOrderPayment,
  getOrderPayment,
  confirmMockOrderPayment,
  payOrder,
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
