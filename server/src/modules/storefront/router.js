const express = require("express");
const { createStorefrontService } = require("./service");

function sendData(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data
  });
}

function sendError(res, message, statusCode = 500) {
  res.status(statusCode).json({
    success: false,
    message,
    statusCode
  });
}

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendError(res, error.message || "服务异常", error.statusCode || 500);
    }
  };
}

function readSessionToken(req) {
  const authorization = String((req.headers || {}).authorization || "").trim();

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  return String((req.headers || {})["x-session-token"] || "").trim();
}

function createStorefrontRouter(options = {}) {
  const router = express.Router();
  const storefrontService = options.storefrontService || createStorefrontService();

  router.get("/api/home", wrap(async (req, res) => {
    sendData(res, await storefrontService.getHomeData());
  }));

  router.get("/api/categories", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCategories());
  }));

  router.get("/api/products", wrap(async (req, res) => {
    sendData(res, await storefrontService.listProducts(req.query || {}));
  }));

  router.get("/api/products/:id", wrap(async (req, res) => {
    const product = await storefrontService.getProductDetail(req.params.id);

    if (!product) {
      sendError(res, "商品不存在", 404);
      return;
    }

    sendData(res, product);
  }));

  router.post("/api/auth/session", wrap(async (req, res) => {
    sendData(res, await storefrontService.createSession(req.body || {}), 201);
  }));

  router.get("/api/me", wrap(async (req, res) => {
    sendData(res, await storefrontService.getMe(readSessionToken(req)));
  }));

  router.post("/api/auth/logout", wrap(async (req, res) => {
    sendData(res, await storefrontService.logout(readSessionToken(req)));
  }));

  router.get("/api/addresses", wrap(async (req, res) => {
    sendData(res, await storefrontService.getAddressListData(readSessionToken(req)));
  }));

  router.get("/api/addresses/:id", wrap(async (req, res) => {
    const address = await storefrontService.getAddressById(readSessionToken(req), req.params.id);

    if (!address) {
      sendError(res, "地址不存在", 404);
      return;
    }

    sendData(res, address);
  }));

  router.post("/api/addresses", wrap(async (req, res) => {
    sendData(res, await storefrontService.createAddress(readSessionToken(req), req.body || {}), 201);
  }));

  router.put("/api/addresses/:id", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.updateAddress(readSessionToken(req), req.params.id, req.body || {})
    );
  }));

  router.delete("/api/addresses/:id", wrap(async (req, res) => {
    sendData(res, await storefrontService.deleteAddress(readSessionToken(req), req.params.id));
  }));

  router.post("/api/addresses/:id/select", wrap(async (req, res) => {
    sendData(res, await storefrontService.setSelectedAddress(readSessionToken(req), req.params.id));
  }));

  router.get("/api/cart", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCartPageData(readSessionToken(req)));
  }));

  router.put("/api/cart", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.setCartItems(readSessionToken(req), (req.body || {}).cartItems || [])
    );
  }));

  router.post("/api/cart/items/add", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.addToCart(readSessionToken(req), (req.body || {}).product || {})
    );
  }));

  router.post("/api/cart/items/increase", wrap(async (req, res) => {
    sendData(res, await storefrontService.increaseCartItem(
      readSessionToken(req),
      (req.body || {}).id,
      (req.body || {}).specText
    ));
  }));

  router.post("/api/cart/items/decrease", wrap(async (req, res) => {
    sendData(res, await storefrontService.decreaseCartItem(
      readSessionToken(req),
      (req.body || {}).id,
      (req.body || {}).specText
    ));
  }));

  router.post("/api/cart/items/remove", wrap(async (req, res) => {
    sendData(res, await storefrontService.removeCartItem(
      readSessionToken(req),
      (req.body || {}).id,
      (req.body || {}).specText
    ));
  }));

  router.get("/api/coupons", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCouponPageData(readSessionToken(req)));
  }));

  router.post("/api/coupons/claim", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.claimCoupon(readSessionToken(req), (req.body || {}).templateId)
    );
  }));

  router.post("/api/coupons/select", wrap(async (req, res) => {
    sendData(res, await storefrontService.selectCoupon(
      readSessionToken(req),
      (req.body || {}).couponId,
      (req.body || {}).amount
    ));
  }));

  router.post("/api/coupons/clear", wrap(async (req, res) => {
    sendData(res, await storefrontService.clearSelectedCoupon(readSessionToken(req)));
  }));

  router.get("/api/checkout", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCheckoutPageData(readSessionToken(req)));
  }));

  router.post("/api/orders/submit", wrap(async (req, res) => {
    sendData(res, await storefrontService.submitOrder(readSessionToken(req), req.body || {}));
  }));

  router.get("/api/orders", wrap(async (req, res) => {
    sendData(res, await storefrontService.getAllOrders(readSessionToken(req)));
  }));

  router.get("/api/orders/:id", wrap(async (req, res) => {
    const detail = await storefrontService.getOrderDetail(readSessionToken(req), req.params.id);

    if (!detail.order) {
      sendError(res, "订单不存在", 404);
      return;
    }

    sendData(res, detail);
  }));

  router.post("/api/orders/:id/status", wrap(async (req, res) => {
    const order = await storefrontService.updateOrderStatus(
      readSessionToken(req),
      req.params.id,
      (req.body || {}).status
    );

    if (!order) {
      sendError(res, "订单不存在", 404);
      return;
    }

    sendData(res, order);
  }));

  router.post("/api/orders/:id/aftersale", wrap(async (req, res) => {
    sendData(res, await storefrontService.createAfterSale(readSessionToken(req), {
      orderId: req.params.id,
      reason: (req.body || {}).reason,
      description: (req.body || {}).description
    }), 201);
  }));

  router.get("/api/profile", wrap(async (req, res) => {
    sendData(res, await storefrontService.getProfileData(readSessionToken(req)));
  }));

  router.post("/api/auth/authorize", wrap(async (req, res) => {
    sendData(res, await storefrontService.authorizeUser(readSessionToken(req)));
  }));

  router.get("/api/distribution", wrap(async (req, res) => {
    sendData(res, await storefrontService.getDistributionData(readSessionToken(req)));
  }));

  router.get("/api/team", wrap(async (req, res) => {
    sendData(res, await storefrontService.getTeamData(readSessionToken(req)));
  }));

  router.get("/api/commissions", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCommissionData(readSessionToken(req)));
  }));

  router.get("/api/poster", wrap(async (req, res) => {
    sendData(res, await storefrontService.getPosterData(readSessionToken(req)));
  }));

  return router;
}

module.exports = {
  createStorefrontRouter
};
