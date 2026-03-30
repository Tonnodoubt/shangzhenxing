const crypto = require("crypto");
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

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password || "")).digest("hex");
}

const adminUsers = [
  {
    id: "admin-1",
    username: "admin",
    realName: "张三",
    mobile: "13800000001",
    status: "enabled",
    lastLoginAt: "",
    passwordHash: hashPassword("Admin@123456"),
    roleCodes: ["super_admin"]
  },
  {
    id: "admin-2",
    username: "ops",
    realName: "李运营",
    mobile: "13800000002",
    status: "enabled",
    lastLoginAt: "",
    passwordHash: hashPassword("Ops@123456"),
    roleCodes: ["ops_manager"]
  },
  {
    id: "admin-3",
    username: "order",
    realName: "王订单",
    mobile: "13800000003",
    status: "enabled",
    lastLoginAt: "",
    passwordHash: hashPassword("Order@123456"),
    roleCodes: ["order_manager", "aftersale_service"]
  }
];

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

  if (!user || user.passwordHash !== hashPassword(password)) {
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

  return sessions.get(normalizedToken) || null;
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

function readAdminToken(req) {
  const authHeader = String(req.headers.authorization || "");

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return String(req.headers["x-admin-token"] || "").trim();
}

function adminAuth(req, res, next) {
  const token = readAdminToken(req);
  const session = sessions.get(token);

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
  readAdminToken
};
