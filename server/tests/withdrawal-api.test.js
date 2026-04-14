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
    payload,
    setCookies: typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : []
  };
}

function assertOkEnvelope(payload) {
  assert.equal(payload.code, 0);
  assert.ok(payload.requestId);
}

function getCookieHeader(setCookies = [], cookieName) {
  return (setCookies || [])
    .map((item) => String(item || "").split(";")[0].trim())
    .find((item) => item.startsWith(`${cookieName}=`)) || "";
}

async function createUserSession() {
  const { status, payload } = await requestJson("/api/v1/auth/session", {
    method: "POST",
    body: {
      loginType: "mock_wechat"
    }
  });

  assert.equal(status, 201);
  assertOkEnvelope(payload);

  return payload.data.sessionToken;
}

async function createAdminSession() {
  const { status, payload, setCookies } = await requestJson("/admin/v1/auth/login", {
    method: "POST",
    body: {
      username: "admin",
      password: "Admin@123456"
    }
  });

  assert.equal(status, 200);
  assertOkEnvelope(payload);

  const adminCookie = getCookieHeader(setCookies, "admin_token");

  assert.ok(adminCookie);

  return adminCookie;
}

test.beforeEach(async () => {
  await startFreshServer();
});

test.afterEach(async () => {
  await stopServer();
});

test("withdrawal lifecycle works over v1 storefront and admin APIs", async () => {
  const sessionToken = await createUserSession();
  const userHeaders = {
    Authorization: `Bearer ${sessionToken}`
  };

  const listBefore = await requestJson("/api/v1/withdrawals", {
    headers: userHeaders
  });

  assert.equal(listBefore.status, 200);
  assertOkEnvelope(listBefore.payload);

  const availableAmount = Number((listBefore.payload.data.balance || {}).availableAmount || 0);
  const amount = Math.max(1, Math.min(availableAmount, 10));
  const serviceFee = amount > 1 ? 1 : 0;

  assert.ok(amount > serviceFee, "availableAmount should be enough to cover fee");

  const createResponse = await requestJson("/api/v1/withdrawals", {
    method: "POST",
    headers: userHeaders,
    body: {
      amount,
      serviceFee,
      channel: "manual_bank",
      accountName: "测试分销员",
      accountNo: "6222000012345678",
      remark: "test withdrawal request"
    }
  });

  assert.equal(createResponse.status, 201);
  assertOkEnvelope(createResponse.payload);
  assert.equal(createResponse.payload.data.status, "submitted");

  const withdrawalId = createResponse.payload.data.id;
  const requestNo = createResponse.payload.data.requestNo;

  assert.ok(withdrawalId);
  assert.ok(requestNo);

  const adminCookie = await createAdminSession();
  const adminHeaders = {
    Cookie: adminCookie
  };

  const adminListResponse = await requestJson(
    `/admin/v1/distribution/withdrawals?keyword=${encodeURIComponent(requestNo)}`,
    { headers: adminHeaders }
  );

  assert.equal(adminListResponse.status, 200);
  assertOkEnvelope(adminListResponse.payload);

  const adminRow = (adminListResponse.payload.data.list || []).find((item) => {
    return (item.id || item.withdrawalId) === withdrawalId;
  });

  assert.ok(adminRow, "admin list should contain created withdrawal");
  assert.equal(adminRow.requestNo, requestNo);
  assert.ok(adminRow.nickname || ((adminRow.distributor || {}).nickname), "admin row should include distributor nickname");

  const reviewResponse = await requestJson(`/admin/v1/distribution/withdrawals/${withdrawalId}/review`, {
    method: "POST",
    headers: adminHeaders,
    body: {
      action: "approve",
      remark: "审核通过"
    }
  });

  assert.equal(reviewResponse.status, 200);
  assertOkEnvelope(reviewResponse.payload);
  assert.equal(reviewResponse.payload.data.status, "approved");

  const payoutResponse = await requestJson(`/admin/v1/distribution/withdrawals/${withdrawalId}/payout`, {
    method: "POST",
    headers: adminHeaders,
    body: {
      result: "paid",
      channel: "manual_bank",
      channelBillNo: `TEST${Date.now()}`,
      remark: "人工打款完成"
    }
  });

  assert.equal(payoutResponse.status, 200);
  assertOkEnvelope(payoutResponse.payload);
  assert.equal(payoutResponse.payload.data.status, "paid");

  const adminDetailResponse = await requestJson(`/admin/v1/distribution/withdrawals/${withdrawalId}`, {
    headers: adminHeaders
  });

  assert.equal(adminDetailResponse.status, 200);
  assertOkEnvelope(adminDetailResponse.payload);
  assert.equal(adminDetailResponse.payload.data.status, "paid");
  assert.ok(Array.isArray(adminDetailResponse.payload.data.payouts));
  assert.ok(adminDetailResponse.payload.data.payouts.length >= 1);

  const userDetailResponse = await requestJson(`/api/v1/withdrawals/${withdrawalId}`, {
    headers: userHeaders
  });

  assert.equal(userDetailResponse.status, 200);
  assertOkEnvelope(userDetailResponse.payload);
  assert.equal(userDetailResponse.payload.data.status, "paid");
});
