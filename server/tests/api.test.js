const test = require("node:test");
const assert = require("node:assert/strict");

const INDEX_MODULE_PATH = require.resolve("../src/index");

let server = null;
let baseUrl = "";

async function startFreshServer() {
  process.env.STOREFRONT_DATA_SOURCE = "memory";

  delete require.cache[INDEX_MODULE_PATH];

  const { startServer } = require("../src/index");

  server = startServer(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  const port = address && typeof address === "object" ? address.port : 0;

  baseUrl = `http://127.0.0.1:${port}`;
}

async function stopServer() {
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  server = null;
  baseUrl = "";
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: typeof options.body === "undefined" ? undefined : JSON.stringify(options.body)
  });

  const payload = await response.json();

  return {
    status: response.status,
    payload
  };
}

async function createUserSession() {
  const { status, payload } = await requestJson("/api/auth/session", {
    method: "POST",
    body: {
      loginType: "mock_wechat"
    }
  });

  assert.equal(status, 201);
  assert.equal(payload.success, true);
  assert.match(payload.data.sessionToken, /^memory_/);

  return payload.data.sessionToken;
}

async function createAdminSession(credentials = {}) {
  const { status, payload } = await requestJson("/admin/v1/auth/login", {
    method: "POST",
    body: {
      username: credentials.username || "order",
      password: credentials.password || "Order@123456"
    }
  });

  assert.equal(status, 200);
  assert.equal(payload.code, 0);
  assert.ok(payload.data.adminToken);

  return payload.data.adminToken;
}

test.beforeEach(async () => {
  await startFreshServer();
});

test.afterEach(async () => {
  await stopServer();
});

test("session lifecycle works over HTTP", async () => {
  const sessionToken = await createUserSession();

  const meResponse = await requestJson("/api/me", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.payload.success, true);
  assert.equal(meResponse.payload.data.user.nickname, "访客用户");
  assert.equal(meResponse.payload.data.session.status, "active");

  const logoutResponse = await requestJson("/api/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(logoutResponse.status, 200);
  assert.deepEqual(logoutResponse.payload.data, {
    ok: true
  });

  const expiredMeResponse = await requestJson("/api/me", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(expiredMeResponse.status, 401);
  assert.equal(expiredMeResponse.payload.success, false);
  assert.match(expiredMeResponse.payload.message, /登录态已失效/);
});

test("checkout and order flow works over HTTP", async () => {
  const sessionToken = await createUserSession();

  const checkoutResponse = await requestJson("/api/checkout", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(checkoutResponse.status, 200);
  assert.equal(checkoutResponse.payload.success, true);
  assert.equal(checkoutResponse.payload.data.address.id, "addr-1");
  assert.equal(checkoutResponse.payload.data.totalCount, 1);
  assert.equal(checkoutResponse.payload.data.payableAmount, "129.00");

  const submitResponse = await requestJson("/api/orders/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      remark: "node test order flow"
    }
  });

  assert.equal(submitResponse.status, 200);
  assert.equal(submitResponse.payload.success, true);
  assert.equal(submitResponse.payload.data.ok, true);
  assert.equal(submitResponse.payload.data.order.status, "pending");
  assert.equal(submitResponse.payload.data.order.remark, "node test order flow");

  const orderId = submitResponse.payload.data.order.id;

  const ordersResponse = await requestJson("/api/orders", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(ordersResponse.status, 200);
  assert.ok(ordersResponse.payload.data.some((item) => item.id === orderId));

  const detailResponse = await requestJson(`/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.payload.data.order.id, orderId);
  assert.equal(detailResponse.payload.data.order.status, "pending");

  const cancelResponse = await requestJson(`/api/orders/${orderId}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      status: "cancelled"
    }
  });

  assert.equal(cancelResponse.status, 200);
  assert.equal(cancelResponse.payload.data.status, "cancelled");
  assert.equal(cancelResponse.payload.data.statusText, "已取消");
});

test("admin fulfillment and aftersale flow works over HTTP", async () => {
  const sessionToken = await createUserSession();
  const submitResponse = await requestJson("/api/orders/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      remark: "node test fulfillment flow"
    }
  });

  assert.equal(submitResponse.status, 200);

  const orderId = submitResponse.payload.data.order.id;
  const adminToken = await createAdminSession();

  const pendingOrdersResponse = await requestJson("/admin/v1/shipments/pending-orders", {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  });

  assert.equal(pendingOrdersResponse.status, 200);
  assert.ok(pendingOrdersResponse.payload.data.list.some((item) => item.orderId === orderId));

  const shipResponse = await requestJson(`/admin/v1/orders/${orderId}/ship`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    body: {
      companyCode: "SF",
      companyName: "顺丰速运",
      trackingNo: "SFTEST0001"
    }
  });

  assert.equal(shipResponse.status, 200);
  assert.equal(shipResponse.payload.data.success, true);

  const shippingDetailResponse = await requestJson(`/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(shippingDetailResponse.status, 200);
  assert.equal(shippingDetailResponse.payload.data.order.status, "shipping");
  assert.equal(shippingDetailResponse.payload.data.order.canAftersale, true);

  const createAfterSaleResponse = await requestJson(`/api/orders/${orderId}/aftersale`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      reason: "不想要了",
      description: "node test aftersale flow"
    }
  });

  assert.equal(createAfterSaleResponse.status, 201);
  assert.equal(createAfterSaleResponse.payload.success, true);
  assert.equal(createAfterSaleResponse.payload.data.status, "processing");

  const afterSaleId = createAfterSaleResponse.payload.data.id;

  const afterSalesResponse = await requestJson("/admin/v1/aftersales", {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  });

  assert.equal(afterSalesResponse.status, 200);
  assert.ok(afterSalesResponse.payload.data.list.some((item) => item.afterSaleId === afterSaleId));

  const reviewResponse = await requestJson(`/admin/v1/aftersales/${afterSaleId}/review`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    body: {
      action: "approve",
      remark: "同意售后"
    }
  });

  assert.equal(reviewResponse.status, 200);
  assert.equal(reviewResponse.payload.data.success, true);

  const reviewedOrderResponse = await requestJson(`/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(reviewedOrderResponse.status, 200);
  assert.equal(reviewedOrderResponse.payload.data.order.aftersaleStatus, "approved");
  assert.equal(reviewedOrderResponse.payload.data.afterSale.status, "approved");
});

test("coupon claim, apply, clear, and restore flow works over HTTP", async () => {
  const sessionToken = await createUserSession();

  const couponPageBeforeClaim = await requestJson("/api/coupons", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(couponPageBeforeClaim.status, 200);
  assert.equal(couponPageBeforeClaim.payload.success, true);

  const template = couponPageBeforeClaim.payload.data.centerTemplates.find((item) => item.id === "tpl-3");

  assert.ok(template);
  assert.equal(template.claimed, false);

  const claimResponse = await requestJson("/api/coupons/claim", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      templateId: "tpl-3"
    }
  });

  assert.equal(claimResponse.status, 200);
  assert.equal(claimResponse.payload.data.ok, true);

  const claimedCoupon = claimResponse.payload.data.coupon;

  const checkoutBeforeSelect = await requestJson("/api/checkout", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(checkoutBeforeSelect.status, 200);
  assert.equal(checkoutBeforeSelect.payload.data.goodsAmountNumber, 129);

  const selectResponse = await requestJson("/api/coupons/select", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      couponId: claimedCoupon.id,
      amount: checkoutBeforeSelect.payload.data.goodsAmountNumber
    }
  });

  assert.equal(selectResponse.status, 200);
  assert.equal(selectResponse.payload.data.ok, true);
  assert.equal(selectResponse.payload.data.coupon.id, claimedCoupon.id);

  const checkoutAfterSelect = await requestJson("/api/checkout", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(checkoutAfterSelect.status, 200);
  assert.equal(checkoutAfterSelect.payload.data.selectedCoupon.id, claimedCoupon.id);
  assert.equal(checkoutAfterSelect.payload.data.discountAmount, "15.00");
  assert.equal(checkoutAfterSelect.payload.data.payableAmount, "114.00");

  const clearResponse = await requestJson("/api/coupons/clear", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(clearResponse.status, 200);
  assert.equal(clearResponse.payload.data.ok, true);

  const checkoutAfterClear = await requestJson("/api/checkout", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(checkoutAfterClear.status, 200);
  assert.equal(checkoutAfterClear.payload.data.selectedCoupon, null);
  assert.equal(checkoutAfterClear.payload.data.discountAmount, "0.00");

  await requestJson("/api/coupons/select", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      couponId: claimedCoupon.id,
      amount: checkoutBeforeSelect.payload.data.goodsAmountNumber
    }
  });

  const submitResponse = await requestJson("/api/orders/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      remark: "node test coupon flow"
    }
  });

  assert.equal(submitResponse.status, 200);
  assert.equal(submitResponse.payload.data.order.couponTitle, "分销专享券");

  const orderId = submitResponse.payload.data.order.id;

  const couponPageAfterSubmit = await requestJson("/api/coupons", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });
  const usedCoupon = couponPageAfterSubmit.payload.data.coupons.find((item) => item.id === claimedCoupon.id);

  assert.ok(usedCoupon);
  assert.equal(usedCoupon.status, "used");

  const cancelResponse = await requestJson(`/api/orders/${orderId}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      status: "cancelled"
    }
  });

  assert.equal(cancelResponse.status, 200);
  assert.equal(cancelResponse.payload.data.status, "cancelled");

  const couponPageAfterCancel = await requestJson("/api/coupons", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });
  const restoredCoupon = couponPageAfterCancel.payload.data.coupons.find((item) => item.id === claimedCoupon.id);

  assert.ok(restoredCoupon);
  assert.equal(restoredCoupon.status, "available");
});

test("authorize and confirm receipt sync commission data over HTTP", async () => {
  const sessionToken = await createUserSession();

  const distributionBefore = await requestJson("/api/distribution", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });
  const commissionBefore = await requestJson("/api/commissions", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(distributionBefore.status, 200);
  assert.equal(commissionBefore.status, 200);

  const previousTotalCommission = distributionBefore.payload.data.distributor.totalCommission;
  const previousPendingCommission = distributionBefore.payload.data.distributor.pendingCommission;
  const previousCommissionCount = commissionBefore.payload.data.records.length;

  const authorizeResponse = await requestJson("/api/auth/authorize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(authorizeResponse.status, 200);
  assert.equal(authorizeResponse.payload.data.isAuthorized, true);
  assert.equal(authorizeResponse.payload.data.nickname, "微信用户");

  const submitResponse = await requestJson("/api/orders/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      remark: "node test commission flow"
    }
  });

  assert.equal(submitResponse.status, 200);

  const orderId = submitResponse.payload.data.order.id;
  const adminToken = await createAdminSession();

  const shipResponse = await requestJson(`/admin/v1/orders/${orderId}/ship`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    body: {
      companyCode: "SF",
      companyName: "顺丰速运",
      trackingNo: "SFTEST0002"
    }
  });

  assert.equal(shipResponse.status, 200);

  const doneResponse = await requestJson(`/api/orders/${orderId}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      status: "done"
    }
  });

  assert.equal(doneResponse.status, 200);
  assert.equal(doneResponse.payload.data.status, "done");

  const commissionAfter = await requestJson("/api/commissions", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });
  const distributionAfter = await requestJson("/api/distribution", {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(commissionAfter.status, 200);
  assert.equal(distributionAfter.status, 200);
  assert.equal(commissionAfter.payload.data.records.length, previousCommissionCount + 1);
  assert.ok(commissionAfter.payload.data.records.some((item) => item.orderNo === orderId));
  assert.ok(distributionAfter.payload.data.distributor.totalCommission > previousTotalCommission);
  assert.ok(distributionAfter.payload.data.distributor.pendingCommission > previousPendingCommission);
});

test("admin permissions are enforced over HTTP", async () => {
  const unauthorizedResponse = await requestJson("/admin/v1/dashboard/summary");

  assert.equal(unauthorizedResponse.status, 401);
  assert.equal(unauthorizedResponse.payload.code, 40101);

  const orderAdminToken = await createAdminSession();
  const forbiddenProductsResponse = await requestJson("/admin/v1/products", {
    headers: {
      Authorization: `Bearer ${orderAdminToken}`
    }
  });

  assert.equal(forbiddenProductsResponse.status, 403);
  assert.equal(forbiddenProductsResponse.payload.code, 40301);

  const opsAdminToken = await createAdminSession({
    username: "ops",
    password: "Ops@123456"
  });
  const allowedProductsResponse = await requestJson("/admin/v1/products", {
    headers: {
      Authorization: `Bearer ${opsAdminToken}`
    }
  });

  assert.equal(allowedProductsResponse.status, 200);
  assert.equal(allowedProductsResponse.payload.code, 0);
  assert.ok(Array.isArray(allowedProductsResponse.payload.data.list));
});

test("session creation validates login mode inputs over HTTP", async () => {
  const unsupportedLoginTypeResponse = await requestJson("/api/auth/session", {
    method: "POST",
    body: {
      loginType: "email_password"
    }
  });

  assert.equal(unsupportedLoginTypeResponse.status, 400);
  assert.equal(unsupportedLoginTypeResponse.payload.success, false);
  assert.match(unsupportedLoginTypeResponse.payload.message, /暂不支持当前登录方式/);

  const missingWechatCodeResponse = await requestJson("/api/auth/session", {
    method: "POST",
    body: {
      loginType: "wechat_miniprogram"
    }
  });

  assert.equal(missingWechatCodeResponse.status, 400);
  assert.equal(missingWechatCodeResponse.payload.success, false);
  assert.match(missingWechatCodeResponse.payload.message, /缺少 wx\.login 返回的 code/);
});

test("submitting order with empty cart is rejected over HTTP", async () => {
  const sessionToken = await createUserSession();

  const removeItemResponse = await requestJson("/api/cart/items/remove", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      id: "p1",
      specText: "标准装"
    }
  });

  assert.equal(removeItemResponse.status, 200);
  assert.equal(removeItemResponse.payload.data.isEmpty, true);

  const submitResponse = await requestJson("/api/orders/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      remark: "empty cart should fail"
    }
  });

  assert.equal(submitResponse.status, 200);
  assert.equal(submitResponse.payload.success, true);
  assert.equal(submitResponse.payload.data.ok, false);
  assert.equal(submitResponse.payload.data.message, "购物车为空");
});

test("coupon threshold validation is enforced over HTTP", async () => {
  const sessionToken = await createUserSession();

  const selectResponse = await requestJson("/api/coupons/select", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      couponId: "coupon-2",
      amount: 129
    }
  });

  assert.equal(selectResponse.status, 200);
  assert.equal(selectResponse.payload.success, true);
  assert.equal(selectResponse.payload.data.ok, false);
  assert.equal(selectResponse.payload.data.message, "当前金额还不能用这张券");
});

test("aftersale preconditions and duplicate submission are enforced over HTTP", async () => {
  const sessionToken = await createUserSession();
  const submitResponse = await requestJson("/api/orders/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      remark: "node test duplicate aftersale flow"
    }
  });

  assert.equal(submitResponse.status, 200);

  const orderId = submitResponse.payload.data.order.id;

  const beforeShippingAfterSaleResponse = await requestJson(`/api/orders/${orderId}/aftersale`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      reason: "不想要了",
      description: "should fail before shipping"
    }
  });

  assert.equal(beforeShippingAfterSaleResponse.status, 400);
  assert.equal(beforeShippingAfterSaleResponse.payload.success, false);
  assert.match(beforeShippingAfterSaleResponse.payload.message, /当前订单暂不可售后/);

  const adminToken = await createAdminSession();
  const shipResponse = await requestJson(`/admin/v1/orders/${orderId}/ship`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    body: {
      companyCode: "SF",
      companyName: "顺丰速运",
      trackingNo: "SFTEST0003"
    }
  });

  assert.equal(shipResponse.status, 200);

  const firstAfterSaleResponse = await requestJson(`/api/orders/${orderId}/aftersale`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      reason: "不想要了",
      description: "first aftersale submission"
    }
  });

  assert.equal(firstAfterSaleResponse.status, 201);

  const duplicateAfterSaleResponse = await requestJson(`/api/orders/${orderId}/aftersale`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      reason: "不想要了",
      description: "duplicate aftersale submission"
    }
  });

  assert.equal(duplicateAfterSaleResponse.status, 409);
  assert.equal(duplicateAfterSaleResponse.payload.success, false);
  assert.match(duplicateAfterSaleResponse.payload.message, /该订单已提交售后/);
});

test("order status validation returns client errors over HTTP", async () => {
  const sessionToken = await createUserSession();
  const submitResponse = await requestJson("/api/orders/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      remark: "node test invalid transition"
    }
  });

  assert.equal(submitResponse.status, 200);

  const orderId = submitResponse.payload.data.order.id;

  const missingStatusResponse = await requestJson(`/api/orders/${orderId}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {}
  });

  assert.equal(missingStatusResponse.status, 400);
  assert.equal(missingStatusResponse.payload.success, false);
  assert.match(missingStatusResponse.payload.message, /缺少订单状态/);

  const adminToken = await createAdminSession();
  const shipResponse = await requestJson(`/admin/v1/orders/${orderId}/ship`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    body: {
      companyCode: "SF",
      companyName: "顺丰速运",
      trackingNo: "SFTEST0004"
    }
  });

  assert.equal(shipResponse.status, 200);

  const invalidCancelResponse = await requestJson(`/api/orders/${orderId}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    body: {
      status: "cancelled"
    }
  });

  assert.equal(invalidCancelResponse.status, 400);
  assert.equal(invalidCancelResponse.payload.success, false);
  assert.match(invalidCancelResponse.payload.message, /当前订单不能执行这个操作/);
});

test("resource lookup and admin login failures return proper status codes over HTTP", async () => {
  const missingProductResponse = await requestJson("/api/products/not-found");

  assert.equal(missingProductResponse.status, 404);
  assert.equal(missingProductResponse.payload.success, false);
  assert.equal(missingProductResponse.payload.message, "商品不存在");

  const failedAdminLoginResponse = await requestJson("/admin/v1/auth/login", {
    method: "POST",
    body: {
      username: "order",
      password: "wrong-password"
    }
  });

  assert.equal(failedAdminLoginResponse.status, 401);
  assert.equal(failedAdminLoginResponse.payload.code, 40102);
  assert.equal(failedAdminLoginResponse.payload.message, "账号或密码错误");
});

test("admin can manage categories, products, and skus over HTTP", async () => {
  const adminToken = await createAdminSession({
    username: "admin",
    password: "Admin@123456"
  });

  const createCategoryResponse = await requestJson("/admin/v1/categories", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    body: {
      name: "联调分类",
      sortOrder: 88,
      status: "enabled"
    }
  });

  assert.equal(createCategoryResponse.status, 201);
  assert.equal(createCategoryResponse.payload.data.name, "联调分类");

  const categoryId = createCategoryResponse.payload.data.categoryId;

  const createProductResponse = await requestJson("/admin/v1/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    body: {
      title: "后台新商品",
      categoryId,
      shortDesc: "商品摘要",
      status: "off_sale",
      price: 88,
      marketPrice: 108,
      distributionEnabled: true
    }
  });

  assert.equal(createProductResponse.status, 201);
  assert.equal(createProductResponse.payload.data.title, "后台新商品");
  assert.equal(createProductResponse.payload.data.status, "off_sale");

  const productId = createProductResponse.payload.data.productId;

  const updateStatusResponse = await requestJson(`/admin/v1/products/${productId}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    body: {
      status: "on_sale"
    }
  });

  assert.equal(updateStatusResponse.status, 200);
  assert.equal(updateStatusResponse.payload.data.status, "on_sale");

  const saveSkuResponse = await requestJson(`/admin/v1/products/${productId}/skus`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`
    },
    body: {
      skus: [
        {
          skuCode: "ADMIN-TEST-1",
          specText: "标准装",
          price: 88,
          originPrice: 108,
          stock: 12,
          lockStock: 0,
          status: "enabled"
        },
        {
          skuCode: "ADMIN-TEST-2",
          specText: "分享装",
          price: 128,
          originPrice: 148,
          stock: 8,
          lockStock: 1,
          status: "enabled"
        }
      ]
    }
  });

  assert.equal(saveSkuResponse.status, 200);
  assert.equal(saveSkuResponse.payload.data.list.length, 2);

  const productsResponse = await requestJson(`/admin/v1/products?categoryId=${encodeURIComponent(categoryId)}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  });

  assert.equal(productsResponse.status, 200);
  assert.ok(productsResponse.payload.data.list.some((item) => item.productId === productId));

  const skusResponse = await requestJson(`/admin/v1/products/${productId}/skus`, {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  });

  assert.equal(skusResponse.status, 200);
  assert.equal(skusResponse.payload.data.list.length, 2);
});
