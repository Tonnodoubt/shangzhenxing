const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const dotenv = require("dotenv");
const { createStorefrontError } = require("../src/modules/storefront/errors");
const {
  setExchangeMiniProgramCodeOverrideForTest,
  resetExchangeMiniProgramCodeOverrideForTest
} = require("../src/lib/wechat-auth");

dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

const SERVER_DIR = path.resolve(__dirname, "..");
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const INDEX_MODULE_PATH = require.resolve("../src/index");

let prismaClient = null;
let prismaSetupPromise = null;
let server = null;
let baseUrl = "";

function readDatabaseTarget() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();

  if (!databaseUrl) {
    return null;
  }

  const url = new URL(databaseUrl);

  return {
    databaseUrl,
    host: url.hostname || "127.0.0.1",
    port: url.port ? Number(url.port) : 3306
  };
}

function canConnect({ host, port }, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host,
      port
    });

    let settled = false;

    function finish(result) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(result);
    }

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || SERVER_DIR,
      env: {
        ...process.env,
        ...(options.env || {})
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({
        code: Number(code || 0),
        stdout,
        stderr
      });
    });

    child.on("error", (error) => {
      resolve({
        code: 1,
        stdout,
        stderr: `${stderr}${error && error.message ? error.message : error}`
      });
    });
  });
}

async function resolveSkipReason() {
  if (String(process.env.RUN_PRISMA_TESTS || "").trim() !== "1") {
    return "设置 RUN_PRISMA_TESTS=1 后再执行 Prisma 真库测试";
  }

  const databaseTarget = readDatabaseTarget();

  if (!databaseTarget) {
    return "server/.env 中缺少 DATABASE_URL，暂时无法执行 Prisma 真库测试";
  }

  const reachable = await canConnect(databaseTarget);

  if (!reachable) {
    return `数据库 ${databaseTarget.host}:${databaseTarget.port} 当前不可连接，请先启动本地 MySQL 或 Docker`;
  }

  return "";
}

async function ensurePrismaSetup(t) {
  const skipReason = await resolveSkipReason();

  if (skipReason) {
    t.skip(skipReason);
    return null;
  }

  if (!prismaSetupPromise) {
    prismaSetupPromise = (async () => {
      const migrateResult = await runCommand(NPM_COMMAND, ["run", "prisma:migrate:deploy"]);

      assert.equal(
        migrateResult.code,
        0,
        `prisma migrate deploy failed\n${(migrateResult.stderr || migrateResult.stdout).trim()}`
      );

      const { getPrismaClient } = require("../src/lib/prisma");

      prismaClient = getPrismaClient();

      return prismaClient;
    })();
  }

  return prismaSetupPromise;
}

async function startPrismaServer() {
  process.env.STOREFRONT_DATA_SOURCE = "prisma";

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

async function requestJson(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
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

async function createAdminSession(credentials = {}) {
  const { status, payload } = await requestJson("/admin/v1/auth/login", {
    method: "POST",
    body: {
      username: credentials.username || "admin",
      password: credentials.password || "Admin@123456"
    }
  });

  assert.equal(status, 200);
  assert.equal(payload.code, 0);
  assert.ok(payload.data.adminToken);

  return payload.data.adminToken;
}

async function cleanupWechatUsers(prisma, options = {}) {
  const openIds = (options.openIds || []).filter(Boolean);
  const unionIds = (options.unionIds || []).filter(Boolean);
  const whereClauses = [];

  if (openIds.length) {
    whereClauses.push({
      openId: {
        in: openIds
      }
    });
  }

  if (unionIds.length) {
    whereClauses.push({
      unionId: {
        in: unionIds
      }
    });
  }

  if (!whereClauses.length) {
    return;
  }

  await prisma.user.deleteMany({
    where: {
      OR: whereClauses
    }
  });
}

test.afterEach(async () => {
  resetExchangeMiniProgramCodeOverrideForTest();
  await stopServer();
});

test.after(async () => {
  if (!prismaClient) {
    return;
  }

  await prismaClient.$disconnect();
  prismaClient = null;
});

test("prisma storefront regression passes against local MySQL", async (t) => {
  const prisma = await ensurePrismaSetup(t);

  if (!prisma) {
    return;
  }

  const regressionResult = await runCommand(process.execPath, ["scripts/run-prisma-regression.js"]);

  assert.equal(
    regressionResult.code,
    0,
    `prisma regression failed\n${(regressionResult.stderr || regressionResult.stdout).trim()}`
  );

  assert.match(regressionResult.stdout, /\[prisma-regression\] passed/);
});

test("prisma wechat login returns 503 when app credentials are missing", async (t) => {
  const prisma = await ensurePrismaSetup(t);

  if (!prisma) {
    return;
  }

  const originalAppId = process.env.WECHAT_APP_ID;
  const originalAppSecret = process.env.WECHAT_APP_SECRET;

  process.env.WECHAT_APP_ID = "";
  process.env.WECHAT_APP_SECRET = "";

  try {
    await startPrismaServer();

    const loginResponse = await requestJson("/api/auth/session", {
      method: "POST",
      body: {
        loginType: "wechat_miniprogram",
        code: "wx-login-code-not-configured"
      }
    });

    assert.equal(loginResponse.status, 503);
    assert.equal(loginResponse.payload.success, false);
    assert.equal(loginResponse.payload.statusCode, 503);
    assert.match(loginResponse.payload.message, /缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET/);
  } finally {
    process.env.WECHAT_APP_ID = originalAppId;
    process.env.WECHAT_APP_SECRET = originalAppSecret;
  }
});

test("prisma wechat login can create and reuse users through HTTP with mocked code exchange", async (t) => {
  const prisma = await ensurePrismaSetup(t);

  if (!prisma) {
    return;
  }

  const openId = "wechat-login-http-openid";
  const firstUnionId = "wechat-login-http-union-a";
  const secondUnionId = "wechat-login-http-union-b";

  await cleanupWechatUsers(prisma, {
    openIds: [openId],
    unionIds: [firstUnionId, secondUnionId]
  });

  setExchangeMiniProgramCodeOverrideForTest(async (code) => {
    if (code === "wx-code-a") {
      return {
        openId,
        unionId: firstUnionId,
        sessionKey: "session-key-a"
      };
    }

    if (code === "wx-code-b") {
      return {
        openId,
        unionId: secondUnionId,
        sessionKey: "session-key-b"
      };
    }

    throw createStorefrontError("微信登录 code 无效，请重新发起登录", 502, "WECHAT_LOGIN_FAILED");
  });

  try {
    await startPrismaServer();

    const firstLoginResponse = await requestJson("/api/auth/session", {
      method: "POST",
      body: {
        loginType: "wechat_miniprogram",
        code: "wx-code-a"
      }
    });

    assert.equal(firstLoginResponse.status, 201);
    assert.equal(firstLoginResponse.payload.success, true);
    assert.match(firstLoginResponse.payload.data.sessionToken, /^prisma_/);
    assert.equal(firstLoginResponse.payload.data.user.nickname, "微信用户");
    assert.equal(firstLoginResponse.payload.data.user.isAuthorized, false);

    let user = await prisma.user.findUnique({
      where: {
        openId
      }
    });

    assert.ok(user);
    assert.equal(user.unionId, firstUnionId);

    const secondLoginResponse = await requestJson("/api/auth/session", {
      method: "POST",
      body: {
        loginType: "wechat_miniprogram",
        code: "wx-code-b"
      }
    });

    assert.equal(secondLoginResponse.status, 201);
    assert.equal(secondLoginResponse.payload.success, true);
    assert.match(secondLoginResponse.payload.data.sessionToken, /^prisma_/);

    user = await prisma.user.findUnique({
      where: {
        openId
      }
    });

    assert.ok(user);
    assert.equal(user.unionId, secondUnionId);

    const userCount = await prisma.user.count({
      where: {
        openId
      }
    });
    const activeSessionCount = await prisma.userSession.count({
      where: {
        userId: user.id,
        status: "active"
      }
    });

    assert.equal(userCount, 1);
    assert.equal(activeSessionCount, 2);

    const meResponse = await requestJson("/api/me", {
      headers: {
        Authorization: `Bearer ${secondLoginResponse.payload.data.sessionToken}`
      }
    });

    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.payload.success, true);
    assert.equal(meResponse.payload.data.user.nickname, "微信用户");
    assert.equal(meResponse.payload.data.user.isAuthorized, false);
  } finally {
    await cleanupWechatUsers(prisma, {
      openIds: [openId],
      unionIds: [firstUnionId, secondUnionId]
    });
  }
});

test("prisma wechat login can bind inviter on first session over HTTP", async (t) => {
  const prisma = await ensurePrismaSetup(t);

  if (!prisma) {
    return;
  }

  const inviterOpenId = "wechat-login-inviter-openid";
  const inviterUnionId = "wechat-login-inviter-unionid";
  const inviteeOpenId = "wechat-login-invitee-openid";
  const inviteeUnionId = "wechat-login-invitee-unionid";

  await cleanupWechatUsers(prisma, {
    openIds: [inviterOpenId, inviteeOpenId],
    unionIds: [inviterUnionId, inviteeUnionId]
  });

  setExchangeMiniProgramCodeOverrideForTest(async (code) => {
    if (code === "wx-inviter-code") {
      return {
        openId: inviterOpenId,
        unionId: inviterUnionId,
        sessionKey: "session-key-inviter"
      };
    }

    if (code === "wx-invitee-code") {
      return {
        openId: inviteeOpenId,
        unionId: inviteeUnionId,
        sessionKey: "session-key-invitee"
      };
    }

    throw createStorefrontError("微信登录 code 无效，请重新发起登录", 502, "WECHAT_LOGIN_FAILED");
  });

  try {
    await startPrismaServer();

    const inviterLoginResponse = await requestJson("/api/auth/session", {
      method: "POST",
      body: {
        loginType: "wechat_miniprogram",
        code: "wx-inviter-code"
      }
    });

    assert.equal(inviterLoginResponse.status, 201);
    assert.equal(inviterLoginResponse.payload.success, true);

    const inviterUserId = inviterLoginResponse.payload.data.user.id;

    assert.ok(inviterUserId);

    const inviteeLoginResponse = await requestJson("/api/auth/session", {
      method: "POST",
      body: {
        loginType: "wechat_miniprogram",
        code: "wx-invitee-code",
        inviterUserId,
        sourceScene: "share"
      }
    });

    assert.equal(inviteeLoginResponse.status, 201);
    assert.equal(inviteeLoginResponse.payload.success, true);

    const binding = await prisma.referralBinding.findUnique({
      where: {
        inviteeUserId: inviteeLoginResponse.payload.data.user.id
      }
    });

    assert.ok(binding);
    assert.equal(binding.inviterUserId, inviterUserId);
    assert.equal(binding.sourceScene, "share");
  } finally {
    await cleanupWechatUsers(prisma, {
      openIds: [inviterOpenId, inviteeOpenId],
      unionIds: [inviterUnionId, inviteeUnionId]
    });
  }
});

test("prisma wechat login surfaces upstream exchange errors over HTTP", async (t) => {
  const prisma = await ensurePrismaSetup(t);

  if (!prisma) {
    return;
  }

  setExchangeMiniProgramCodeOverrideForTest(async () => {
    throw createStorefrontError("微信登录 code 无效，请重新发起登录", 502, "WECHAT_LOGIN_FAILED");
  });

  await startPrismaServer();

  const loginResponse = await requestJson("/api/auth/session", {
    method: "POST",
    body: {
      loginType: "wechat_miniprogram",
      code: "bad-wechat-code"
    }
  });

  assert.equal(loginResponse.status, 502);
  assert.equal(loginResponse.payload.success, false);
  assert.equal(loginResponse.payload.statusCode, 502);
  assert.match(loginResponse.payload.message, /微信登录 code 无效/);
});

test("prisma admin can manage categories, products, and skus over HTTP", async (t) => {
  const prisma = await ensurePrismaSetup(t);

  if (!prisma) {
    return;
  }

  const uniqueSuffix = `${Date.now()}${Math.round(Math.random() * 1000)}`;
  const categoryName = `真库联调分类-${uniqueSuffix}`;
  const productTitle = `真库后台商品-${uniqueSuffix}`;
  let categoryId = "";
  let productId = "";

  try {
    await startPrismaServer();

    const adminToken = await createAdminSession();

    const createCategoryResponse = await requestJson("/admin/v1/categories", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      body: {
        name: categoryName,
        sortOrder: 66,
        status: "enabled"
      }
    });

    assert.equal(createCategoryResponse.status, 201);
    categoryId = createCategoryResponse.payload.data.categoryId;
    assert.ok(categoryId);

    const createProductResponse = await requestJson("/admin/v1/products", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      body: {
        title: productTitle,
        categoryId,
        shortDesc: "真库后台商品摘要",
        status: "off_sale",
        price: 168,
        marketPrice: 198,
        distributionEnabled: true
      }
    });

    assert.equal(createProductResponse.status, 201);
    productId = createProductResponse.payload.data.productId;
    assert.ok(productId);

    const saveSkuResponse = await requestJson(`/admin/v1/products/${productId}/skus`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      body: {
        skus: [
          {
            skuCode: `PRISMA-ADMIN-${uniqueSuffix}-1`,
            specText: "标准装",
            price: 168,
            originPrice: 198,
            stock: 9,
            lockStock: 0,
            status: "enabled"
          },
          {
            skuCode: `PRISMA-ADMIN-${uniqueSuffix}-2`,
            specText: "礼赠装",
            price: 228,
            originPrice: 258,
            stock: 4,
            lockStock: 1,
            status: "enabled"
          }
        ]
      }
    });

    assert.equal(saveSkuResponse.status, 200);
    assert.equal(saveSkuResponse.payload.data.list.length, 2);

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

    const product = await prisma.product.findUnique({
      where: {
        id: productId
      },
      include: {
        skus: true
      }
    });

    assert.ok(product);
    assert.equal(product.title, productTitle);
    assert.equal(product.status, "on_sale");
    assert.equal(product.categoryId, categoryId);
    assert.equal((product.skus || []).length, 2);
  } finally {
    if (productId) {
      await prisma.product.deleteMany({
        where: {
          id: productId
        }
      });
    }

    if (categoryId) {
      await prisma.category.deleteMany({
        where: {
          id: categoryId
        }
      });
    }
  }
});
