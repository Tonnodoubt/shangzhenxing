const express = require("express");
const { createAdminService } = require("../modules/admin/service");
const { sendData, sendError, wrap } = require("../shared/http");
const { requireString } = require("../../shared/utils");
const {
  adminAuth,
  requirePermission,
  loginAdmin,
  getAdminSession,
  logoutAdmin,
  readAdminToken,
  setAdminTokenCookie,
  clearAdminTokenCookie
} = require("./auth");

const router = express.Router();
const adminService = createAdminService();

// ── 登录速率限制（内存实现，按 IP 限流） ──
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 分钟窗口
const LOGIN_MAX_ATTEMPTS = 10;           // 窗口内最多 10 次
const loginAttempts = new Map();

function loginRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    next();
    return;
  }

  record.count += 1;

  if (record.count > LOGIN_MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader("Retry-After", String(retryAfter));
    sendError(res, "登录尝试过于频繁，请稍后再试", {
      code: 42901,
      statusCode: 429,
      requestId: req.requestId
    });
    return;
  }

  next();
}

router.post("/admin/v1/auth/login", loginRateLimit, wrap((req, res) => {
  const result = loginAdmin(
    requireString((req.body || {}).username),
    requireString((req.body || {}).password)
  );

  if (!result.ok) {
    sendError(res, result.message, {
      code: 40102,
      statusCode: 401,
      requestId: req.requestId
    });
    return;
  }

  setAdminTokenCookie(res, result.adminToken);

  sendData(res, {
    adminUser: result.adminUser,
    roleCodes: result.roleCodes,
    permissions: result.permissions,
    dataScopes: result.dataScopes
  }, {
    requestId: req.requestId
  });
}));

router.use("/admin/v1", adminAuth);

router.get("/admin/v1/dashboard/summary", requirePermission("dashboard.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getDashboardSummary(), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/auth/me", wrap((req, res) => {
  const session = getAdminSession(readAdminToken(req));

  if (!session) {
    sendError(res, "登录已失效，请重新登录", {
      code: 40101,
      statusCode: 401,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, session, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/auth/logout", wrap((req, res) => {
  logoutAdmin(readAdminToken(req));
  clearAdminTokenCookie(res);
  sendData(res, { ok: true }, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/categories", requirePermission("category.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getCategories(req.query || {}), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/categories", requirePermission("category.create"), wrap(async (req, res) => {
  sendData(res, await adminService.saveCategory(req.body || {}), {
    statusCode: 201,
    requestId: req.requestId
  });
}));

router.put("/admin/v1/categories/:categoryId", requirePermission("category.edit"), wrap(async (req, res) => {
  const record = await adminService.saveCategory({
    ...(req.body || {}),
    categoryId: req.params.categoryId
  });

  if (!record) {
    sendError(res, "分类不存在", {
      code: 40401,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, record, {
    requestId: req.requestId
  });
}));

router.delete("/admin/v1/categories/:categoryId", requirePermission("category.delete"), wrap(async (req, res) => {
  const record = await adminService.deleteCategory(req.params.categoryId);

  if (!record) {
    sendError(res, "分类不存在", {
      code: 40401,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/products", requirePermission("product.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getProducts(req.query || {}), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/products/:productId", requirePermission("product.view"), wrap(async (req, res) => {
  const record = await adminService.getProductDetail(req.params.productId);

  if (!record) {
    sendError(res, "商品不存在", {
      code: 40402,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/products", requirePermission("product.create"), wrap(async (req, res) => {
  sendData(res, await adminService.saveProduct(req.body || {}), {
    statusCode: 201,
    requestId: req.requestId
  });
}));

router.put("/admin/v1/products/:productId", requirePermission("product.edit"), wrap(async (req, res) => {
  const record = await adminService.saveProduct({
    ...(req.body || {}),
    productId: req.params.productId
  });

  if (!record) {
    sendError(res, "商品不存在", {
      code: 40402,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/products/:productId/status", requirePermission("product.status"), wrap(async (req, res) => {
  const record = await adminService.updateProductStatus(
    req.params.productId,
    requireString((req.body || {}).status, "off_sale")
  );

  if (!record) {
    sendError(res, "商品不存在", {
      code: 40402,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, record, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/products/:productId/skus", requirePermission("sku.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getProductSkus(req.params.productId), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/products/:productId/skus", requirePermission("sku.edit"), wrap(async (req, res) => {
  const record = await adminService.saveProductSkus(req.params.productId, req.body || {});

  if (!record) {
    sendError(res, "商品不存在", {
      code: 40402,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, record, {
    requestId: req.requestId
  });
}));

router.put("/admin/v1/skus/:skuId/stock", requirePermission("stock.adjust"), wrap(async (req, res) => {
  const record = await adminService.updateSkuStock(
    req.params.skuId,
    Number((req.body || {}).stock || 0)
  );

  if (!record) {
    sendError(res, "SKU 不存在", {
      code: 40403,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, record, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/orders", requirePermission("order.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getOrders(req.query || {}), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/orders/:orderId", requirePermission("order.detail"), wrap(async (req, res) => {
  const record = await adminService.getOrderDetail(req.params.orderId);

  if (!record) {
    sendError(res, "订单不存在", {
      code: 40404,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/orders/:orderId/cancel", requirePermission("order.cancel"), wrap(async (req, res) => {
  const record = await adminService.cancelOrder(req.params.orderId);

  if (!record) {
    sendError(res, "订单不存在", {
      code: 40404,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/shipments/pending-orders", requirePermission("shipment.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getPendingShipmentOrders(req.query || {}), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/orders/:orderId/ship", requirePermission("shipment.create"), wrap(async (req, res) => {
  const record = await adminService.shipOrder(req.params.orderId, req.body || {});

  if (!record) {
    sendError(res, "订单不存在", {
      code: 40404,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/aftersales", requirePermission("aftersale.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getAfterSales(req.query || {}), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/aftersales/:afterSaleId/review", requirePermission("aftersale.review"), wrap(async (req, res) => {
  const action = requireString((req.body || {}).action);
  const permissionCode = action === "approve" ? "aftersale.approve" : action === "reject" ? "aftersale.reject" : "";

  if (permissionCode && !req.adminSession.permissions.includes("*") && !req.adminSession.permissions.includes(permissionCode)) {
    sendError(res, "当前账号没有该操作权限", {
      code: 40301,
      statusCode: 403,
      requestId: req.requestId
    });
    return;
  }

  const record = await adminService.reviewAfterSale(
    req.params.afterSaleId,
    req.body || {},
    req.adminSession.adminUser
  );

  if (!record) {
    sendError(res, "售后单不存在", {
      code: 40405,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

// ── 优惠券管理（Phase 3: 从 mallService 迁入 adminService） ──

router.get("/admin/v1/coupon-templates", requirePermission("coupon.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getCouponTemplates(req.query || {}), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/coupon-templates", requirePermission("coupon.create"), wrap(async (req, res) => {
  sendData(res, await adminService.saveCouponTemplate(req.body || {}), {
    statusCode: 201,
    requestId: req.requestId
  });
}));

router.put("/admin/v1/coupon-templates/:templateId", requirePermission("coupon.edit"), wrap(async (req, res) => {
  const record = await adminService.saveCouponTemplate({
    ...(req.body || {}),
    templateId: req.params.templateId
  });

  if (!record) {
    sendError(res, "优惠券模板不存在", {
      code: 40406,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/coupon-templates/:templateId/status", requirePermission("coupon.status"), wrap(async (req, res) => {
  const record = await adminService.updateCouponTemplateStatus(
    req.params.templateId,
    requireString((req.body || {}).status, "disabled")
  );

  if (!record) {
    sendError(res, "优惠券模板不存在", {
      code: 40406,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, { success: true }, {
    requestId: req.requestId
  });
}));

// ── 分销管理（Phase 3: 从 mallService 迁入 adminService） ──

router.get("/admin/v1/distribution/rules", requirePermission("distribution.rule.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getDistributionRules(), {
    requestId: req.requestId
  });
}));

router.put("/admin/v1/distribution/rules", requirePermission("distribution.rule.edit"), wrap(async (req, res) => {
  sendData(res, await adminService.updateDistributionRules(req.body || {}, {
    adminUserId: req.adminSession.adminUser.id,
    realName: req.adminSession.adminUser.realName
  }), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/distributors", requirePermission("distribution.distributor.view"), wrap(async (req, res) => {
  sendData(res, await adminService.getDistributors(req.query || {}), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/distributors/:distributorId", requirePermission("distribution.distributor.view"), wrap(async (req, res) => {
  const record = await adminService.getDistributorDetail(req.params.distributorId);

  if (!record) {
    sendError(res, "分销员不存在", {
      code: 40407,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/distributors/:distributorId/status", requirePermission("distribution.distributor.status"), wrap(async (req, res) => {
  const record = await adminService.updateDistributorStatus(
    req.params.distributorId,
    requireString((req.body || {}).status, "disabled")
  );

  if (!record) {
    sendError(res, "分销员不存在", {
      code: 40407,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendData(res, { success: true }, {
    requestId: req.requestId
  });
}));

module.exports = router;
