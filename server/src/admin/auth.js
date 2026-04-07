const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { sendAdminError } = require("./http");

const ROLE_PRESETS = {
  super_admin: {
    permissions: ["*"],
    dataScopes: {
      product: "all",
      order: "all",
      aftersale: "all",
      distribution: "all"
    }
  },
  ops_manager: {
    permissions: [
      "dashboard.page",
      "dashboard.view",
      "product.page",
      "product.view",
      "category.page",
      "category.view",
      "coupon.page",
      "coupon.view",
      "coupon.create",
      "coupon.edit",
      "coupon.status",
      "order.page",
      "order.view",
      "order.detail"
    ],
    dataScopes: {
      product: "all",
      order: "readonly_all"
    }
  },
  product_manager: {
    permissions: [
      "dashboard.page",
      "dashboard.view",
      "product.page",
      "product.view",
      "product.create",
      "product.edit",
      "product.status",
      "category.page",
      "category.view",
      "category.create",
      "category.edit",
      "category.delete",
      "sku.page",
      "sku.view",
      "sku.edit",
      "stock.adjust"
    ],
    dataScopes: {
      product: "all"
    }
  },
  order_manager: {
    permissions: [
      "dashboard.page",
      "dashboard.view",
      "order.page",
      "order.view",
      "order.detail",
      "order.cancel",
      "order.export",
      "shipment.page",
      "shipment.view",
      "shipment.create",
      "shipment.confirm",
      "aftersale.page",
      "aftersale.view"
    ],
    dataScopes: {
      order: "all",
      aftersale: "readonly_all"
    }
  },
  aftersale_service: {
    permissions: [
      "dashboard.page",
      "dashboard.view",
      "order.page",
      "order.view",
      "order.detail",
      "aftersale.page",
      "aftersale.view",
      "aftersale.review",
      "aftersale.approve",
      "aftersale.reject"
    ],
    dataScopes: {
      order: "readonly_all",
      aftersale: "all"
    }
  },
  distribution_ops: {
    permissions: [
      "dashboard.page",
      "dashboard.view",
      "distribution.rule.page",
      "distribution.rule.view",
      "distribution.rule.edit",
      "distribution.distributor.page",
      "distribution.distributor.view",
      "distribution.distributor.review",
      "distribution.distributor.status",
      "distribution.commission.view"
    ],
    dataScopes: {
      distribution: "all"
    }
  },
  finance_reviewer: {
    permissions: [
      "dashboard.page",
      "dashboard.view",
      "dashboard.export",
      "order.page",
      "order.view",
      "order.detail",
      "order.export",
      "distribution.distributor.page",
      "distribution.distributor.view",
      "distribution.commission.view",
      "distribution.withdraw.review"
    ],
    dataScopes: {
      order: "readonly_all",
      distribution: "readonly_all"
    }
  },
  readonly_analyst: {
    permissions: [
      "dashboard.page",
      "dashboard.view",
      "product.page",
      "product.view",
      "category.page",
      "category.view",
      "order.page",
      "order.view",
      "order.detail",
      "coupon.page",
      "coupon.view",
      "distribution.rule.page",
      "distribution.rule.view",
      "distribution.distributor.page",
      "distribution.distributor.view"
    ],
    dataScopes: {
      product: "readonly_all",
      order: "readonly_all",
      distribution: "readonly_all"
    }
  }
};

const SCOPE_PRIORITY = {
  readonly_all: 1,
  self_created: 2,
  self_follow: 3,
  assigned_scope: 4,
  all: 5
};

// 会话过期时间（毫秒），默认 8 小时
const SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 8 * 60 * 60 * 1000);

/**
 * 从环境变量加载管理员账户。
 * 格式: ADMIN_USERS='[{"id":"admin-1","username":"admin","realName":"张三","mobile":"13800000001","passwordHash":"$2a$10$...","roleCodes":["super_admin"]}]'
 * passwordHash 必须是 bcryptjs 生成的 hash。
 *
 * 如果未设置 ADMIN_USERS，使用内置的演示账户（仅限开发环境）。
 */
function loadAdminUsers() {
  const raw = process.env.ADMIN_USERS;

  if (raw) {
    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("ADMIN_USERS 必须是非空数组");
      }

      return parsed.map((u) => ({
        id: u.id,
        username: u.username,
        realName: u.realName || "",
        mobile: u.mobile || "",
        status: u.status || "enabled",
        lastLoginAt: "",
        passwordHash: u.passwordHash,
        roleCodes: u.roleCodes || []
      }));
    } catch (err) {
      console.error("[auth] 解析 ADMIN_USERS 失败:", err.message);
      process.exit(1);
    }
  }

  // 开发环境回退：使用 bcrypt hash 代替明文
  if (process.env.NODE_ENV === "production") {
    console.error("[auth] 生产环境必须设置 ADMIN_USERS 环境变量");
    process.exit(1);
  }

  console.warn("[auth] ⚠ 未设置 ADMIN_USERS，使用开发演示账户");
  return [
    {
      id: "admin-1",
      username: "admin",
      realName: "张三",
      mobile: "13800000001",
      status: "enabled",
      lastLoginAt: "",
      passwordHash: bcrypt.hashSync("Admin@123456", 10),
      roleCodes: ["super_admin"]
    },
    {
      id: "admin-2",
      username: "ops",
      realName: "李运营",
      mobile: "13800000002",
      status: "enabled",
      lastLoginAt: "",
      passwordHash: bcrypt.hashSync("Ops@123456", 10),
      roleCodes: ["ops_manager"]
    },
    {
      id: "admin-3",
      username: "order",
      realName: "王订单",
      mobile: "13800000003",
      status: "enabled",
      lastLoginAt: "",
      passwordHash: bcrypt.hashSync("Order@123456", 10),
      roleCodes: ["order_manager", "aftersale_service"]
    }
  ];
}

const adminUsers = loadAdminUsers();
const sessions = new Map();

function formatAdminUser(user) {
  return {
    id: user.id,
    username: user.username,
    realName: user.realName,
    mobile: user.mobile,
    status: user.status,
    statusText: user.status === "enabled" ? "正常" : "已禁用",
    lastLoginAt: user.lastLoginAt || ""
  };
}

function uniq(list) {
  return Array.from(new Set(list));
}

function mergePermissions(roleCodes) {
  if (roleCodes.includes("super_admin")) {
    return ["*"];
  }

  return uniq(roleCodes.reduce((result, roleCode) => {
    return result.concat((ROLE_PRESETS[roleCode] || {}).permissions || []);
  }, []));
}

function mergeDataScopes(roleCodes) {
  return roleCodes.reduce((result, roleCode) => {
    const scopes = (ROLE_PRESETS[roleCode] || {}).dataScopes || {};

    Object.keys(scopes).forEach((moduleCode) => {
      const nextScope = scopes[moduleCode];
      const currentScope = result[moduleCode];

      if (!currentScope || SCOPE_PRIORITY[nextScope] > SCOPE_PRIORITY[currentScope]) {
        result[moduleCode] = nextScope;
      }
    });

    return result;
  }, {});
}

function buildSession(user) {
  const roleCodes = user.roleCodes || [];

  return {
    adminUser: formatAdminUser(user),
    roleCodes,
    permissions: mergePermissions(roleCodes),
    dataScopes: mergeDataScopes(roleCodes)
  };
}

function createSessionToken() {
  return crypto.randomBytes(16).toString("hex");
}

function loginAdmin(username, password) {
  const user = adminUsers.find((item) => item.username === username);

  if (!user || !bcrypt.compareSync(String(password || ""), user.passwordHash)) {
    return {
      ok: false,
      message: "账号或密码错误"
    };
  }

  if (user.status !== "enabled") {
    return {
      ok: false,
      message: "当前账号已被禁用"
    };
  }

  user.lastLoginAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  const sessionToken = createSessionToken();
  const session = buildSession(user);

  session.expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(sessionToken, session);

  return {
    ok: true,
    adminToken: sessionToken,
    ...session
  };
}

function getAdminSession(token) {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    return null;
  }

  const session = sessions.get(normalizedToken);

  if (!session) {
    return null;
  }

  if (session.expiresAt && Date.now() > session.expiresAt) {
    sessions.delete(normalizedToken);
    return null;
  }

  return session;
}

function logoutAdmin(token) {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    return {
      ok: false
    };
  }

  sessions.delete(normalizedToken);

  return {
    ok: true
  };
}

function parseCookieHeader(header) {
  const result = {};

  String(header || "").split(";").forEach((pair) => {
    const idx = pair.indexOf("=");

    if (idx > 0) {
      result[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    }
  });

  return result;
}

function readAdminToken(req) {
  // 优先从 httpOnly cookie 读取（防 XSS）
  const cookies = parseCookieHeader(req.headers.cookie);

  if (cookies.admin_token) {
    return cookies.admin_token;
  }

  // 兼容 Authorization header（API 调用场景）
  const authHeader = String(req.headers.authorization || "");

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return String(req.headers["x-admin-token"] || "").trim();
}

function setAdminTokenCookie(res, token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);

  res.setHeader("Set-Cookie", `admin_token=${token}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=${maxAge}`);
}

function clearAdminTokenCookie(res) {
  res.setHeader("Set-Cookie", "admin_token=; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=0");
}

function adminAuth(req, res, next) {
  const token = readAdminToken(req);
  const session = getAdminSession(token);

  if (!token || !session) {
    sendAdminError(res, "登录已失效，请重新登录", {
      code: 40101,
      statusCode: 401,
      requestId: req.requestId
    });
    return;
  }

  req.adminSession = session;
  next();
}

function hasPermission(session, permission) {
  if (!session) {
    return false;
  }

  return session.permissions.includes("*") || session.permissions.includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.adminSession, permission)) {
      sendAdminError(res, "当前账号没有该操作权限", {
        code: 40301,
        statusCode: 403,
        requestId: req.requestId
      });
      return;
    }

    next();
  };
}

module.exports = {
  adminAuth,
  requirePermission,
  loginAdmin,
  getAdminSession,
  logoutAdmin,
  readAdminToken,
  setAdminTokenCookie,
  clearAdminTokenCookie
};
