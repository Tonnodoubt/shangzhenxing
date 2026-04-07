const express = require("express");
const { createStorefrontService } = require("./service");
const { sendData, sendError, wrap } = require("../../shared/http");

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
    sendData(res, await storefrontService.getHomeData(), {
      requestId: req.requestId
    });
  }));

  router.get("/api/categories", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCategories(), {
      requestId: req.requestId
    });
  }));

  router.get("/api/products", wrap(async (req, res) => {
    sendData(res, await storefrontService.listProducts(req.query || {}), {
      requestId: req.requestId
    });
  }));

  router.get("/api/products/:id", wrap(async (req, res) => {
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

  router.post("/api/auth/session", wrap(async (req, res) => {
    sendData(res, await storefrontService.createSession(req.body || {}), {
      statusCode: 201,
      requestId: req.requestId
    });
  }));

  router.get("/api/me", wrap(async (req, res) => {
    sendData(res, await storefrontService.getMe(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.post("/api/auth/logout", wrap(async (req, res) => {
    sendData(res, await storefrontService.logout(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/addresses", wrap(async (req, res) => {
    sendData(res, await storefrontService.getAddressListData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/addresses/:id", wrap(async (req, res) => {
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

  router.post("/api/addresses", wrap(async (req, res) => {
    sendData(res, await storefrontService.createAddress(readSessionToken(req), req.body || {}), {
      statusCode: 201,
      requestId: req.requestId
    });
  }));

  router.put("/api/addresses/:id", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.updateAddress(readSessionToken(req), req.params.id, req.body || {}),
      { requestId: req.requestId }
    );
  }));

  router.delete("/api/addresses/:id", wrap(async (req, res) => {
    sendData(res, await storefrontService.deleteAddress(readSessionToken(req), req.params.id), {
      requestId: req.requestId
    });
  }));

  router.post("/api/addresses/:id/select", wrap(async (req, res) => {
    sendData(res, await storefrontService.setSelectedAddress(readSessionToken(req), req.params.id), {
      requestId: req.requestId
    });
  }));

  router.get("/api/cart", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCartPageData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.put("/api/cart", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.setCartItems(readSessionToken(req), (req.body || {}).cartItems || []),
      { requestId: req.requestId }
    );
  }));

  router.post("/api/cart/items/add", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.addToCart(readSessionToken(req), (req.body || {}).product || {}),
      { requestId: req.requestId }
    );
  }));

  router.post("/api/cart/items/increase", wrap(async (req, res) => {
    sendData(res, await storefrontService.increaseCartItem(
      readSessionToken(req),
      (req.body || {}).id,
      (req.body || {}).specText
    ), { requestId: req.requestId });
  }));

  router.post("/api/cart/items/decrease", wrap(async (req, res) => {
    sendData(res, await storefrontService.decreaseCartItem(
      readSessionToken(req),
      (req.body || {}).id,
      (req.body || {}).specText
    ), { requestId: req.requestId });
  }));

  router.post("/api/cart/items/remove", wrap(async (req, res) => {
    sendData(res, await storefrontService.removeCartItem(
      readSessionToken(req),
      (req.body || {}).id,
      (req.body || {}).specText
    ), { requestId: req.requestId });
  }));

  router.get("/api/coupons", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCouponPageData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.post("/api/coupons/claim", wrap(async (req, res) => {
    sendData(
      res,
      await storefrontService.claimCoupon(readSessionToken(req), (req.body || {}).templateId),
      { requestId: req.requestId }
    );
  }));

  router.post("/api/coupons/select", wrap(async (req, res) => {
    sendData(res, await storefrontService.selectCoupon(
      readSessionToken(req),
      (req.body || {}).couponId,
      (req.body || {}).amount
    ), { requestId: req.requestId });
  }));

  router.post("/api/coupons/clear", wrap(async (req, res) => {
    sendData(res, await storefrontService.clearSelectedCoupon(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/checkout", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCheckoutPageData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.post("/api/orders/submit", wrap(async (req, res) => {
    sendData(res, await storefrontService.submitOrder(readSessionToken(req), req.body || {}), {
      requestId: req.requestId
    });
  }));

  router.get("/api/orders", wrap(async (req, res) => {
    sendData(res, await storefrontService.getAllOrders(readSessionToken(req), req.query || {}), {
      requestId: req.requestId
    });
  }));

  router.get("/api/orders/:id", wrap(async (req, res) => {
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

  router.post("/api/orders/:id/status", wrap(async (req, res) => {
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

  router.post("/api/orders/:id/aftersale", wrap(async (req, res) => {
    sendData(res, await storefrontService.createAfterSale(readSessionToken(req), {
      orderId: req.params.id,
      reason: (req.body || {}).reason,
      description: (req.body || {}).description
    }), {
      statusCode: 201,
      requestId: req.requestId
    });
  }));

  router.get("/api/profile", wrap(async (req, res) => {
    sendData(res, await storefrontService.getProfileData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.post("/api/auth/authorize", wrap(async (req, res) => {
    sendData(res, await storefrontService.authorizeUser(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/distribution", wrap(async (req, res) => {
    sendData(res, await storefrontService.getDistributionData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/team", wrap(async (req, res) => {
    sendData(res, await storefrontService.getTeamData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/commissions", wrap(async (req, res) => {
    sendData(res, await storefrontService.getCommissionData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  router.get("/api/poster", wrap(async (req, res) => {
    sendData(res, await storefrontService.getPosterData(readSessionToken(req)), {
      requestId: req.requestId
    });
  }));

  return router;
}

module.exports = {
  createStorefrontRouter
};
