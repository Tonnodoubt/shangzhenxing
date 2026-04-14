const express = require("express");
const { createStorefrontService } = require("./service");
const { sendData, sendError, wrap } = require("../../shared/http");
const { createRateLimiter } = require("../../shared/rate-limit");
const { isWechatAuthConfigured } = require("../../lib/wechat-auth");
const { isMockWechatLoginAllowed } = require("../../repositories/storefront/session-login");
const {
  addressSchema,
  orderSubmitSchema,
  afterSaleSchema,
  authorizeSchema,
  validateBody
} = require("../../shared/validation");

function readSessionToken(req) {
  const authorization = String((req.headers || {}).authorization || "").trim();

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  return String((req.headers || {})["x-session-token"] || "").trim();
}

function readBoundedIntEnv(name, fallback, options = {}) {
  const min = Number.isFinite(Number(options.min)) ? Number(options.min) : Number.MIN_SAFE_INTEGER;
  const max = Number.isFinite(Number(options.max)) ? Number(options.max) : Number.MAX_SAFE_INTEGER;
  const parsed = Number(process.env[name]);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const value = Math.floor(parsed);

  if (value < min || value > max) {
    return fallback;
  }

  return value;
}

function createStorefrontRouter(options = {}) {
  const router = express.Router();
  const storefrontService = options.storefrontService || createStorefrontService();
  const userIdentityBySession = (req) => readSessionToken(req);
  const defaultLimiterWindowMs = readBoundedIntEnv("STOREFRONT_RATE_LIMIT_WINDOW_MS", 10 * 60 * 1000, {
    min: 1000,
    max: 60 * 60 * 1000
  });
  const readLimiterWindowMs = (name) => readBoundedIntEnv(name, defaultLimiterWindowMs, {
    min: 1000,
    max: 60 * 60 * 1000
  });
  const readLimiterMax = (name, fallback) => readBoundedIntEnv(name, fallback, {
    min: 1,
    max: 100000
  });
  const sessionCreateLimiter = createRateLimiter({
    keyPrefix: "storefront:auth:session",
    windowMs: readLimiterWindowMs("STOREFRONT_RATE_LIMIT_AUTH_SESSION_WINDOW_MS"),
    max: readLimiterMax("STOREFRONT_RATE_LIMIT_AUTH_SESSION_MAX", 20),
    code: 42911,
    message: "登录请求过于频繁，请稍后再试"
  });
  const authAuthorizeLimiter = createRateLimiter({
    keyPrefix: "storefront:auth:authorize",
    windowMs: readLimiterWindowMs("STOREFRONT_RATE_LIMIT_AUTH_AUTHORIZE_WINDOW_MS"),
    max: readLimiterMax("STOREFRONT_RATE_LIMIT_AUTH_AUTHORIZE_MAX", 30),
    code: 42912,
    keyBy: userIdentityBySession,
    message: "授权请求过于频繁，请稍后再试"
  });
  const orderSubmitLimiter = createRateLimiter({
    keyPrefix: "storefront:order:submit",
    windowMs: readLimiterWindowMs("STOREFRONT_RATE_LIMIT_ORDER_SUBMIT_WINDOW_MS"),
    max: readLimiterMax("STOREFRONT_RATE_LIMIT_ORDER_SUBMIT_MAX", 40),
    code: 42913,
    keyBy: userIdentityBySession,
    message: "下单请求过于频繁，请稍后再试"
  });
  const paymentPrepareLimiter = createRateLimiter({
    keyPrefix: "storefront:payment:prepare",
    windowMs: readLimiterWindowMs("STOREFRONT_RATE_LIMIT_PAYMENT_PREPARE_WINDOW_MS"),
    max: readLimiterMax("STOREFRONT_RATE_LIMIT_PAYMENT_PREPARE_MAX", 80),
    code: 42914,
    keyBy: userIdentityBySession,
    message: "支付请求过于频繁，请稍后再试"
  });
  const paymentMockConfirmLimiter = createRateLimiter({
    keyPrefix: "storefront:payment:mock-confirm",
    windowMs: readLimiterWindowMs("STOREFRONT_RATE_LIMIT_PAYMENT_MOCK_CONFIRM_WINDOW_MS"),
    max: readLimiterMax("STOREFRONT_RATE_LIMIT_PAYMENT_MOCK_CONFIRM_MAX", 120),
    code: 42915,
    keyBy: userIdentityBySession,
    message: "支付确认请求过于频繁，请稍后再试"
  });
  const afterSaleSubmitLimiter = createRateLimiter({
    keyPrefix: "storefront:aftersale:submit",
    windowMs: readLimiterWindowMs("STOREFRONT_RATE_LIMIT_AFTERSALE_SUBMIT_WINDOW_MS"),
    max: readLimiterMax("STOREFRONT_RATE_LIMIT_AFTERSALE_SUBMIT_MAX", 30),
    code: 42916,
    keyBy: userIdentityBySession,
    message: "售后提交过于频繁，请稍后再试"
  });

  router.get("/api/v1/home", wrap(async (req, res) => {
    sendData(res, await storefrontService.getHomeData(), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/categories", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCategories(), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/products", wrap(async (req, res) => {
    sendData(res, await storefrontService.listProducts(req.query || {}), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/products/:id", wrap(async (req, res) => {
    const product = await storefrontService.getProductDetail(req.params.id);

    if (!product) {
      sendError(res, "商品不存在", {
        code: 40402,
        statusCode: 404,
        requestId: req.requestId
      });
      return;
    }

    sendData(res, product, {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/auth/session", sessionCreateLimiter, wrap(async (req, res) => {
    sendData(res, await storefrontService.createSession(req.body || {}), {
      statusCode: 201,
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/auth/login-readiness", wrap(async (req, res) => {
    sendData(res, {
      wechatMiniProgram: {
        enabled: true,
        configured: isWechatAuthConfigured()
      },
      mockWechat: {
        enabled: isMockWechatLoginAllowed()
      },
      mobileCode: {
        enabled: false
      },
      accountPassword: {
        enabled: false
      }
    }, {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/me", wrap(async (req, res) => {
    sendData(res, await storefrontService.getMe(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/auth/logout", wrap(async (req, res) => {
    sendData(res, await storefrontService.logout(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/addresses", wrap(async (req, res) => {
    sendData(res, await storefrontService.getAddressListData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/addresses/:id", wrap(async (req, res) => {
    const address = await storefrontService.getAddressById(readSessionToken(req), req.params.id);

    if (!address) {
      sendError(res, "地址不存在", {
        code: 40401,
        statusCode: 404,
        requestId: req.requestId
      });
      return;
    }

    sendData(res, address, {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/addresses", validateBody(addressSchema), wrap(async (req, res) => {
    sendData(res, await storefrontService.createAddress(readSessionToken(req), req.body || {}), {
      statusCode: 201,
      requestId: req.requestId
    });
  }));

  router.put("/api/v1/addresses/:id", validateBody(addressSchema), wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.updateAddress(readSessionToken(req), req.params.id, req.body || {}),
      { requestId: req.requestId }
    );
  }));

  router.delete("/api/v1/addresses/:id", wrap(async (req, res) => {
    sendData(res, await storefrontService.deleteAddress(readSessionToken(req), req.params.id), {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/addresses/:id/select", wrap(async (req, res) => {
    sendData(res, await storefrontService.setSelectedAddress(readSessionToken(req), req.params.id), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/cart", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCartPageData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.put("/api/v1/cart", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.setCartItems(readSessionToken(req), (req.body || {}).cartItems || []),
      { requestId: req.requestId }
    );
  }));

  router.post("/api/v1/cart/items/add", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.addToCart(readSessionToken(req), (req.body || {}).product || {}),
      { requestId: req.requestId }
    );
  }));

  router.post("/api/v1/cart/items/increase", wrap(async (req, res) => {
    sendData(res, await storefrontService.increaseCartItem(
      readSessionToken(req),
      (req.body || {}).id,
      (req.body || {}).specText
    ), { requestId: req.requestId });
  }));

  router.post("/api/v1/cart/items/decrease", wrap(async (req, res) => {
    sendData(res, await storefrontService.decreaseCartItem(
      readSessionToken(req),
      (req.body || {}).id,
      (req.body || {}).specText
    ), { requestId: req.requestId });
  }));

  router.post("/api/v1/cart/items/remove", wrap(async (req, res) => {
    sendData(res, await storefrontService.removeCartItem(
      readSessionToken(req),
      (req.body || {}).id,
      (req.body || {}).specText
    ), { requestId: req.requestId });
  }));

  router.get("/api/v1/coupons", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCouponPageData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/coupons/claim", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.claimCoupon(readSessionToken(req), (req.body || {}).templateId),
      { requestId: req.requestId }
    );
  }));

  router.post("/api/v1/coupons/select", wrap(async (req, res) => {
    sendData(res, await storefrontService.selectCoupon(
      readSessionToken(req),
      (req.body || {}).couponId,
      (req.body || {}).amount
    ), { requestId: req.requestId });
  }));

  router.post("/api/v1/coupons/clear", wrap(async (req, res) => {
    sendData(res, await storefrontService.clearSelectedCoupon(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/checkout", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCheckoutPageData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/orders/submit", orderSubmitLimiter, validateBody(orderSubmitSchema), wrap(async (req, res) => {
    sendData(res, await storefrontService.submitOrder(readSessionToken(req), req.body || {}), {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/orders/:id/payment/prepare", paymentPrepareLimiter, wrap(async (req, res) => {
    const payment = await storefrontService.prepareOrderPayment(
      readSessionToken(req),
      req.params.id,
      req.body || {}
    );

    if (!payment) {
      sendError(res, "订单不存在", {
        code: 40404,
        statusCode: 404,
        requestId: req.requestId
      });
      return;
    }

    sendData(res, payment, {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/orders/:id/payment", wrap(async (req, res) => {
    const payment = await storefrontService.getOrderPayment(readSessionToken(req), req.params.id);

    if (!payment) {
      sendError(res, "订单不存在", {
        code: 40404,
        statusCode: 404,
        requestId: req.requestId
      });
      return;
    }

    sendData(res, payment, {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/orders/:id/payment/mock-confirm", paymentMockConfirmLimiter, wrap(async (req, res) => {
    const payment = await storefrontService.confirmMockOrderPayment(
      readSessionToken(req),
      req.params.id,
      req.body || {}
    );

    if (!payment) {
      sendError(res, "订单不存在", {
        code: 40404,
        statusCode: 404,
        requestId: req.requestId
      });
      return;
    }

    sendData(res, payment, {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/payments/wechat/notify", async (req, res) => {
    try {
      await storefrontService.handleWechatPayNotify({
        headers: req.headers || {},
        body: req.body || {},
        rawBody: typeof req.rawBody === "string" ? req.rawBody : ""
      });

      res.status(200).json({
        code: "SUCCESS",
        message: "成功"
      });
    } catch (error) {
      const label = req.requestId ? `[request:${req.requestId}]` : "[request:unknown]";
      const payload = error && error.stack ? error.stack : error;
      console.warn(`${label} wechat-pay-notify-fail`, payload);

      res.status(500).json({
        code: "FAIL",
        message: "失败"
      });
    }
  });

  router.get("/api/v1/orders", wrap(async (req, res) => {
    sendData(res, await storefrontService.getAllOrders(readSessionToken(req), req.query || {}), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/orders/:id", wrap(async (req, res) => {
    const detail = await storefrontService.getOrderDetail(readSessionToken(req), req.params.id);

    if (!detail.order) {
      sendError(res, "订单不存在", {
        code: 40404,
        statusCode: 404,
        requestId: req.requestId
      });
      return;
    }

    sendData(res, detail, {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/orders/:id/status", wrap(async (req, res) => {
    const order = await storefrontService.updateOrderStatus(
      readSessionToken(req),
      req.params.id,
      (req.body || {}).status
    );

    if (!order) {
      sendError(res, "订单不存在", {
        code: 40404,
        statusCode: 404,
        requestId: req.requestId
      });
      return;
    }

    sendData(res, order, {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/orders/:id/aftersale", afterSaleSubmitLimiter, validateBody(afterSaleSchema), wrap(async (req, res) => {
    sendData(res, await storefrontService.createAfterSale(readSessionToken(req), {
      orderId: req.params.id,
      reason: (req.body || {}).reason,
      description: (req.body || {}).description
    }), {
      statusCode: 201,
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/profile", wrap(async (req, res) => {
    sendData(res, await storefrontService.getProfileData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/auth/authorize", authAuthorizeLimiter, validateBody(authorizeSchema), wrap(async (req, res) => {
    sendData(res, await storefrontService.authorizeUser(readSessionToken(req), {
      phoneCode: (req.body || {}).phoneCode,
      phoneNumber: (req.body || {}).phoneNumber,
      nickname: (req.body || {}).nickname,
      avatarUrl: (req.body || {}).avatarUrl
    }), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/distribution", wrap(async (req, res) => {
    sendData(res, await storefrontService.getDistributionData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/team", wrap(async (req, res) => {
    sendData(res, await storefrontService.getTeamData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/commissions", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCommissionData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/withdrawals", wrap(async (req, res) => {
    sendData(res, await storefrontService.getWithdrawalRequests(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/withdrawals", wrap(async (req, res) => {
    sendData(res, await storefrontService.createWithdrawalRequest(readSessionToken(req), req.body || {}), {
      statusCode: 201,
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/withdrawals/:id", wrap(async (req, res) => {
    const record = await storefrontService.getWithdrawalDetail(readSessionToken(req), req.params.id);

    if (!record) {
      sendError(res, "提现单不存在", {
        code: 40410,
        statusCode: 404,
        requestId: req.requestId
      });
      return;
    }

    sendData(res, record, {
      requestId: req.requestId
    });
  }));

  router.post("/api/v1/withdrawals/:id/cancel", wrap(async (req, res) => {
    const record = await storefrontService.cancelWithdrawalRequest(readSessionToken(req), req.params.id);

    if (!record) {
      sendError(res, "提现单不存在", {
        code: 40410,
        statusCode: 404,
        requestId: req.requestId
      });
      return;
    }

    sendData(res, record, {
      requestId: req.requestId
    });
  }));

  router.get("/api/v1/poster", wrap(async (req, res) => {
    sendData(res, await storefrontService.getPosterData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  return router;
}

module.exports = {
  createStorefrontRouter
};
