const VALID_STOREFRONT_DATA_SOURCES = new Set(["memory", "prisma"]);
const VALID_PAYMENT_PROVIDERS = new Set(["mock", "wechat_jsapi"]);

function normalizeText(value) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^[\s"'`“”‘’]+|[\s"'`“”‘’]+$/g, "");
}

function normalizeBoolean(value, fallback) {
  const text = normalizeText(value).toLowerCase();

  if (!text) {
    return fallback;
  }

  if (["1", "true", "yes", "y", "on"].includes(text)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(text)) {
    return false;
  }

  return fallback;
}

function normalizeNumber(value, fallback) {
  const text = normalizeText(value);

  if (!text) {
    return fallback;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function normalizeStorefrontDataSource(value, fallback = "memory") {
  const text = normalizeText(value).toLowerCase();
  return VALID_STOREFRONT_DATA_SOURCES.has(text) ? text : fallback;
}

function normalizePaymentProvider(value, fallback = "mock") {
  const text = normalizeText(value).toLowerCase();

  return VALID_PAYMENT_PROVIDERS.has(text) ? text : fallback;
}

function parseAdminUsers(raw) {
  if (!raw) {
    return {
      ok: false,
      error: "ADMIN_USERS 为空"
    };
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return {
        ok: false,
        error: "ADMIN_USERS 必须是非空数组"
      };
    }

    const errors = [];
    parsed.forEach((item, index) => {
      const userLabel = `ADMIN_USERS[${index}]`;
      const username = normalizeText(item && item.username);
      const passwordHash = normalizeText(item && item.passwordHash);
      const roleCodes = Array.isArray(item && item.roleCodes) ? item.roleCodes : [];

      if (!username) {
        errors.push(`${userLabel}.username 不能为空`);
      }

      if (!passwordHash) {
        errors.push(`${userLabel}.passwordHash 不能为空`);
      }

      if (roleCodes.length === 0) {
        errors.push(`${userLabel}.roleCodes 不能为空数组`);
      }
    });

    if (errors.length) {
      return {
        ok: false,
        error: errors.join("；")
      };
    }

    return {
      ok: true,
      value: parsed
    };
  } catch (error) {
    return {
      ok: false,
      error: `ADMIN_USERS 不是合法 JSON：${error && error.message ? error.message : error}`
    };
  }
}

function isDatabaseUrlValid(databaseUrl) {
  if (!databaseUrl) {
    return false;
  }

  try {
    const parsed = new URL(databaseUrl);
    return !!(parsed.hostname && parsed.pathname && parsed.pathname !== "/");
  } catch (_error) {
    return false;
  }
}

function readRuntimeEnv(env = process.env) {
  const nodeEnv = normalizeText(env.NODE_ENV || "development").toLowerCase() || "development";
  const defaults = {
    isProduction: nodeEnv === "production"
  };

  return {
    nodeEnv,
    isProduction: defaults.isProduction,
    port: normalizeNumber(env.PORT, 3000),
    storefrontDataSource: normalizeStorefrontDataSource(env.STOREFRONT_DATA_SOURCE, "memory"),
    paymentProvider: normalizePaymentProvider(env.PAYMENT_PROVIDER, "mock"),
    databaseUrl: normalizeText(env.DATABASE_URL),
    wechatAppId: normalizeText(env.WECHAT_APP_ID),
    wechatAppSecret: normalizeText(env.WECHAT_APP_SECRET),
    wechatPayMchId: normalizeText(env.WECHAT_PAY_MCH_ID),
    wechatPaySerialNo: normalizeText(env.WECHAT_PAY_SERIAL_NO),
    wechatPayPrivateKey: normalizeText(env.WECHAT_PAY_PRIVATE_KEY),
    wechatPayNotifyUrl: normalizeText(env.WECHAT_PAY_NOTIFY_URL),
    wechatPayApiV3Key: normalizeText(env.WECHAT_PAY_API_V3_KEY),
    wechatPayPlatformPublicKey: normalizeText(env.WECHAT_PAY_PLATFORM_PUBLIC_KEY),
    wechatPayPlatformSerial: normalizeText(env.WECHAT_PAY_PLATFORM_SERIAL),
    allowMockWechatLogin: normalizeBoolean(env.ALLOW_MOCK_WECHAT_LOGIN, !defaults.isProduction),
    adminUsersRaw: normalizeText(env.ADMIN_USERS),
    corsOrigins: normalizeText(env.CORS_ORIGINS),
    adminSessionTtlMs: normalizeNumber(env.ADMIN_SESSION_TTL_MS, 8 * 60 * 60 * 1000),
    databaseTcpProbeTimeoutMs: normalizeNumber(env.DATABASE_TCP_PROBE_TIMEOUT_MS, 2000),
    cosSecretId: normalizeText(env.COS_SECRET_ID),
    cosSecretKey: normalizeText(env.COS_SECRET_KEY),
    cosBucket: normalizeText(env.COS_BUCKET),
    cosRegion: normalizeText(env.COS_REGION)
  };
}

function validateRuntimeEnv(config = readRuntimeEnv(), options = {}) {
  const strict = !!options.strict;
  const errors = [];
  const warnings = [];

  if (!Number.isInteger(config.port) || config.port <= 0 || config.port > 65535) {
    errors.push("PORT 必须是 1-65535 之间的整数");
  }

  if (!VALID_STOREFRONT_DATA_SOURCES.has(config.storefrontDataSource)) {
    errors.push("STOREFRONT_DATA_SOURCE 仅支持 memory 或 prisma");
  }

  if (!VALID_PAYMENT_PROVIDERS.has(config.paymentProvider)) {
    errors.push("PAYMENT_PROVIDER 仅支持 mock 或 wechat_jsapi");
  }

  if (config.paymentProvider === "wechat_jsapi") {
    const requiredWechatPayVars = [
      ["WECHAT_APP_ID", config.wechatAppId],
      ["WECHAT_PAY_MCH_ID", config.wechatPayMchId],
      ["WECHAT_PAY_SERIAL_NO", config.wechatPaySerialNo],
      ["WECHAT_PAY_PRIVATE_KEY", config.wechatPayPrivateKey],
      ["WECHAT_PAY_NOTIFY_URL", config.wechatPayNotifyUrl],
      ["WECHAT_PAY_API_V3_KEY", config.wechatPayApiV3Key],
      ["WECHAT_PAY_PLATFORM_PUBLIC_KEY", config.wechatPayPlatformPublicKey],
      ["WECHAT_PAY_PLATFORM_SERIAL", config.wechatPayPlatformSerial]
    ];
    const missing = requiredWechatPayVars
      .filter((item) => !item[1])
      .map((item) => item[0]);

    if (missing.length) {
      errors.push(`PAYMENT_PROVIDER=wechat_jsapi 时缺少配置：${missing.join("、")}`);
    }
  }

  if (config.storefrontDataSource === "prisma") {
    if (!config.databaseUrl) {
      errors.push("STOREFRONT_DATA_SOURCE=prisma 时必须配置 DATABASE_URL");
    } else if (!isDatabaseUrlValid(config.databaseUrl)) {
      errors.push("DATABASE_URL 格式无效，无法解析数据库主机和库名");
    }
  }

  if (!config.allowMockWechatLogin && (!config.wechatAppId || !config.wechatAppSecret)) {
    errors.push("ALLOW_MOCK_WECHAT_LOGIN=false 时必须同时配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET");
  }

  if (config.isProduction) {
    const adminUsersResult = parseAdminUsers(config.adminUsersRaw);

    if (!adminUsersResult.ok) {
      errors.push(`生产环境 ADMIN_USERS 配置错误：${adminUsersResult.error}`);
    }

    if (config.allowMockWechatLogin) {
      warnings.push("生产环境当前仍允许 mock 微信登录（ALLOW_MOCK_WECHAT_LOGIN=true）");
    }
  } else if (!config.adminUsersRaw) {
    warnings.push("未配置 ADMIN_USERS，将使用开发演示账户（仅建议本地开发）");
  }

  if (
    !Number.isInteger(config.adminSessionTtlMs)
    || config.adminSessionTtlMs <= 0
    || config.adminSessionTtlMs > 30 * 24 * 60 * 60 * 1000
  ) {
    errors.push("ADMIN_SESSION_TTL_MS 必须是 1 到 2592000000 之间的整数（毫秒）");
  }

  if (
    !Number.isInteger(config.databaseTcpProbeTimeoutMs)
    || config.databaseTcpProbeTimeoutMs < 500
    || config.databaseTcpProbeTimeoutMs > 120000
  ) {
    errors.push("DATABASE_TCP_PROBE_TIMEOUT_MS 必须是 500 到 120000 之间的整数（毫秒）");
  }

  const cosValues = [config.cosSecretId, config.cosSecretKey, config.cosBucket, config.cosRegion];
  const hasAnyCosValue = cosValues.some(Boolean);
  const hasAllCosValue = cosValues.every(Boolean);

  if (hasAnyCosValue && !hasAllCosValue) {
    errors.push("COS 上传配置必须同时提供 COS_SECRET_ID、COS_SECRET_KEY、COS_BUCKET、COS_REGION");
  }

  if (config.isProduction && !hasAnyCosValue) {
    warnings.push("未配置 COS_*，后台图片将保存在容器本地磁盘，重启后可能丢失");
  }

  if (strict && !config.corsOrigins) {
    warnings.push("CORS_ORIGINS 为空；如果后续要跨域访问后台接口，请补充白名单");
  }

  return {
    errors,
    warnings
  };
}

function formatValidationReport(result, options = {}) {
  const context = normalizeText(options.context || "env-check");
  const lines = [`[${context}] 环境配置检查结果`];

  if (result.errors.length === 0 && result.warnings.length === 0) {
    lines.push("- 通过：未发现错误或警告");
    return lines.join("\n");
  }

  if (result.errors.length) {
    lines.push("- 错误：");
    result.errors.forEach((item) => {
      lines.push(`  - ${item}`);
    });
  } else {
    lines.push("- 错误：无");
  }

  if (result.warnings.length) {
    lines.push("- 警告：");
    result.warnings.forEach((item) => {
      lines.push(`  - ${item}`);
    });
  } else {
    lines.push("- 警告：无");
  }

  return lines.join("\n");
}

function assertRuntimeEnv(options = {}) {
  const config = options.config || readRuntimeEnv(options.env);
  const result = validateRuntimeEnv(config, options);

  if (result.errors.length) {
    const report = formatValidationReport(result, options);
    const error = new Error(report);
    error.code = "ENV_VALIDATION_FAILED";
    error.validation = result;
    throw error;
  }

  return {
    config,
    result
  };
}

module.exports = {
  readRuntimeEnv,
  validateRuntimeEnv,
  formatValidationReport,
  assertRuntimeEnv
};
