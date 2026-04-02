const express = require("express");
const mallService = require("../shared/mall");
const { createAdminService } = require("../modules/admin/service");
const { sendAdminData, sendAdminError } = require("./http");
const {
  adminAuth,
  requirePermission,
  loginAdmin,
  getAdminSession,
  logoutAdmin,
  readAdminToken
} = require("./auth");

const router = express.Router();
const adminService = createAdminService();

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendAdminError(res, error.message || "服务异常", {
        statusCode: error.statusCode || 500,
        requestId: req.requestId
      });
    }
  };
}

function requireString(value, fallback = "") {
  return String(value || fallback).trim();
}

router.post("/admin/v1/auth/login", wrap((req, res) => {
  const result = loginAdmin(
    requireString((req.body || {}).username),
    requireString((req.body || {}).password)
  );

  if (!result.ok) {
    sendAdminError(res, result.message, {
      code: 40102,
      statusCode: 401,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, {
    adminToken: result.adminToken,
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
  sendAdminData(res, await adminService.getDashboardSummary(), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/auth/me", wrap((req, res) => {
  const session = getAdminSession(readAdminToken(req));

  if (!session) {
    sendAdminError(res, "登录已失效，请重新登录", {
      code: 40101,
      statusCode: 401,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, session, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/auth/logout", wrap((req, res) => {
  sendAdminData(res, logoutAdmin(readAdminToken(req)), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/categories", requirePermission("category.view"), wrap(async (req, res) => {
  sendAdminData(res, await adminService.getCategories(req.query || {}), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/categories", requirePermission("category.create"), wrap(async (req, res) => {
  sendAdminData(res, await adminService.saveCategory(req.body || {}), {
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
    sendAdminError(res, "分类不存在", {
      code: 40401,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, record, {
    requestId: req.requestId
  });
}));

router.delete("/admin/v1/categories/:categoryId", requirePermission("category.delete"), wrap(async (req, res) => {
  const record = await adminService.deleteCategory(req.params.categoryId);

  if (!record) {
    sendAdminError(res, "分类不存在", {
      code: 40401,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/products", requirePermission("product.view"), wrap(async (req, res) => {
  sendAdminData(res, await adminService.getProducts(req.query || {}), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/products/:productId", requirePermission("product.view"), wrap(async (req, res) => {
  const record = await adminService.getProductDetail(req.params.productId);

  if (!record) {
    sendAdminError(res, "商品不存在", {
      code: 40402,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/products", requirePermission("product.create"), wrap(async (req, res) => {
  sendAdminData(res, await adminService.saveProduct(req.body || {}), {
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
    sendAdminError(res, "商品不存在", {
      code: 40402,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/products/:productId/status", requirePermission("product.status"), wrap(async (req, res) => {
  const record = await adminService.updateProductStatus(
    req.params.productId,
    requireString((req.body || {}).status, "off_sale")
  );

  if (!record) {
    sendAdminError(res, "商品不存在", {
      code: 40402,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, record, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/products/:productId/skus", requirePermission("sku.view"), wrap(async (req, res) => {
  sendAdminData(res, await adminService.getProductSkus(req.params.productId), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/products/:productId/skus", requirePermission("sku.edit"), wrap(async (req, res) => {
  const record = await adminService.saveProductSkus(req.params.productId, req.body || {});

  if (!record) {
    sendAdminError(res, "商品不存在", {
      code: 40402,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, record, {
    requestId: req.requestId
  });
}));

router.put("/admin/v1/skus/:skuId/stock", requirePermission("stock.adjust"), wrap(async (req, res) => {
  const record = await adminService.updateSkuStock(
    req.params.skuId,
    Number((req.body || {}).stock || 0)
  );

  if (!record) {
    sendAdminError(res, "SKU 不存在", {
      code: 40403,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, record, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/orders", requirePermission("order.view"), wrap(async (req, res) => {
  sendAdminData(res, await adminService.getOrders(req.query || {}), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/orders/:orderId", requirePermission("order.detail"), wrap(async (req, res) => {
  const record = await adminService.getOrderDetail(req.params.orderId);

  if (!record) {
    sendAdminError(res, "订单不存在", {
      code: 40404,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/orders/:orderId/cancel", requirePermission("order.cancel"), wrap(async (req, res) => {
  const record = await adminService.cancelOrder(req.params.orderId);

  if (!record) {
    sendAdminError(res, "订单不存在", {
      code: 40404,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/shipments/pending-orders", requirePermission("shipment.view"), wrap(async (req, res) => {
  sendAdminData(res, await adminService.getPendingShipmentOrders(req.query || {}), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/orders/:orderId/ship", requirePermission("shipment.create"), wrap(async (req, res) => {
  const record = await adminService.shipOrder(req.params.orderId, req.body || {});

  if (!record) {
    sendAdminError(res, "订单不存在", {
      code: 40404,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/aftersales", requirePermission("aftersale.view"), wrap(async (req, res) => {
  sendAdminData(res, await adminService.getAfterSales(req.query || {}), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/aftersales/:afterSaleId/review", requirePermission("aftersale.review"), wrap(async (req, res) => {
  const action = requireString((req.body || {}).action);
  const permissionCode = action === "approve" ? "aftersale.approve" : action === "reject" ? "aftersale.reject" : "";

  if (permissionCode && !req.adminSession.permissions.includes("*") && !req.adminSession.permissions.includes(permissionCode)) {
    sendAdminError(res, "当前账号没有该操作权限", {
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
    sendAdminError(res, "售后单不存在", {
      code: 40405,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/coupon-templates", requirePermission("coupon.view"), wrap((req, res) => {
  sendAdminData(res, mallService.getAdminCouponTemplates(req.query || {}), {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/coupon-templates", requirePermission("coupon.create"), wrap((req, res) => {
  sendAdminData(res, mallService.saveAdminCouponTemplate(req.body || {}), {
    statusCode: 201,
    requestId: req.requestId
  });
}));

router.put("/admin/v1/coupon-templates/:templateId", requirePermission("coupon.edit"), wrap((req, res) => {
  const record = mallService.saveAdminCouponTemplate({
    ...(req.body || {}),
    templateId: req.params.templateId
  });

  if (!record) {
    sendAdminError(res, "优惠券模板不存在", {
      code: 40406,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/coupon-templates/:templateId/status", requirePermission("coupon.status"), wrap((req, res) => {
  const record = mallService.updateAdminCouponTemplateStatus(
    req.params.templateId,
    requireString((req.body || {}).status, "disabled")
  );

  if (!record) {
    sendAdminError(res, "优惠券模板不存在", {
      code: 40406,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/distribution/rules", requirePermission("distribution.rule.view"), wrap((req, res) => {
  sendAdminData(res, mallService.getAdminDistributionRules(), {
    requestId: req.requestId
  });
}));

router.put("/admin/v1/distribution/rules", requirePermission("distribution.rule.edit"), wrap((req, res) => {
  sendAdminData(res, mallService.updateAdminDistributionRules(req.body || {}, {
    adminUserId: req.adminSession.adminUser.id,
    realName: req.adminSession.adminUser.realName
  }), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/distributors", requirePermission("distribution.distributor.view"), wrap((req, res) => {
  sendAdminData(res, mallService.getAdminDistributors(req.query || {}), {
    requestId: req.requestId
  });
}));

router.get("/admin/v1/distributors/:distributorId", requirePermission("distribution.distributor.view"), wrap((req, res) => {
  const record = mallService.getAdminDistributorDetail(req.params.distributorId);

  if (!record) {
    sendAdminError(res, "分销员不存在", {
      code: 40407,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, record, {
    requestId: req.requestId
  });
}));

router.post("/admin/v1/distributors/:distributorId/status", requirePermission("distribution.distributor.status"), wrap((req, res) => {
  const record = mallService.updateAdminDistributorStatus(
    req.params.distributorId,
    requireString((req.body || {}).status, "disabled")
  );

  if (!record) {
    sendAdminError(res, "分销员不存在", {
      code: 40407,
      statusCode: 404,
      requestId: req.requestId
    });
    return;
  }

  sendAdminData(res, {
    success: true
  }, {
    requestId: req.requestId
  });
}));

module.exports = router;
