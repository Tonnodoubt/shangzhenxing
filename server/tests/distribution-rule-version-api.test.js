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

test("distribution rule versions can be created and published", async () => {
  const adminCookie = await createAdminSession();
  const adminHeaders = {
    Cookie: adminCookie
  };

  const currentRules = await requestJson("/admin/v1/distribution/rules", {
    headers: adminHeaders
  });

  assert.equal(currentRules.status, 200);
  assertOkEnvelope(currentRules.payload);
  assert.equal(typeof currentRules.payload.data.enabled, "boolean");

  const listBefore = await requestJson("/admin/v1/distribution/rule-versions?page=1&pageSize=20", {
    headers: adminHeaders
  });

  assert.equal(listBefore.status, 200);
  assertOkEnvelope(listBefore.payload);
  assert.ok(Array.isArray(listBefore.payload.data.list));
  assert.ok(listBefore.payload.data.list.length >= 1);

  const createDraft = await requestJson("/admin/v1/distribution/rule-versions", {
    method: "POST",
    headers: adminHeaders,
    body: {
      enabled: true,
      levelOneRate: 9.5,
      levelTwoRate: 2.5,
      bindDays: 20,
      minWithdrawalAmount: 50,
      serviceFeeRate: 0.006,
      serviceFeeFixed: 1,
      ruleDesc: "测试草稿规则"
    }
  });

  assert.equal(createDraft.status, 201);
  assertOkEnvelope(createDraft.payload);
  assert.equal(createDraft.payload.data.status, "draft");

  const versionId = createDraft.payload.data.versionId;

  assert.ok(versionId);

  const publish = await requestJson(`/admin/v1/distribution/rule-versions/${versionId}/publish`, {
    method: "POST",
    headers: adminHeaders,
    body: {}
  });

  assert.equal(publish.status, 200);
  assertOkEnvelope(publish.payload);
  assert.equal(publish.payload.data.status, "published");
  assert.equal(publish.payload.data.versionId, versionId);

  const currentAfterPublish = await requestJson("/admin/v1/distribution/rules", {
    headers: adminHeaders
  });

  assert.equal(currentAfterPublish.status, 200);
  assertOkEnvelope(currentAfterPublish.payload);
  assert.equal(currentAfterPublish.payload.data.activeVersionId, versionId);
  assert.equal(currentAfterPublish.payload.data.bindDays, 20);

  const logs = await requestJson("/admin/v1/distribution/rule-change-logs?page=1&pageSize=20", {
    headers: adminHeaders
  });

  assert.equal(logs.status, 200);
  assertOkEnvelope(logs.payload);
  assert.ok(Array.isArray(logs.payload.data.list));
  assert.ok(logs.payload.data.list.some((item) => item.action === "published"));
});
