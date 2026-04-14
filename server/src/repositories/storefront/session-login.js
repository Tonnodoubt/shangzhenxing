let bcrypt = null;

try {
  bcrypt = require("bcryptjs");
} catch {
  bcrypt = null;
}

function normalizeBooleanEnv(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

const MOBILE_CODE_EXPIRE_MS = 5 * 60 * 1000;
const MOBILE_CODE_RESEND_INTERVAL_MS = 60 * 1000;
const MOBILE_CODE_MAX_VERIFY_ATTEMPTS = 5;
const mobileCodeStore = new Map();

// 定期清理过期的验证码记录
const mobileCodeCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [mobile, record] of mobileCodeStore) {
    if (record.expiresAt <= now) {
      mobileCodeStore.delete(mobile);
    }
  }
}, 5 * 60 * 1000);
if (typeof mobileCodeCleanupTimer.unref === "function") {
  mobileCodeCleanupTimer.unref();
}
// 默认验证码生成器——仅测试辅助函数会替换此引用，生产代码路径始终使用默认值
let _randomCodeGenerator = () => String(Math.floor(100000 + Math.random() * 900000));

const DEFAULT_NON_PRODUCTION_ACCOUNT_USERS = [
  {
    account: "demo",
    mobile: "13800006688",
    password: "Demo@123456",
    nickname: "演示账号"
  }
];

function normalizeMainlandChinaMobile(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function ensureValidMainlandChinaMobile(mobile, createStorefrontError) {
  if (/^1\d{10}$/.test(mobile)) {
    return;
  }

  throw createStorefrontError("请输入正确的 11 位手机号", 400, "MOBILE_INVALID");
}

function maskMobile(mobile = "") {
  const normalized = normalizeMainlandChinaMobile(mobile);

  if (!/^1\d{10}$/.test(normalized)) {
    return normalized;
  }

  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

function normalizeSixDigitCode(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function normalizeAccountLoginUser(item = {}) {
  const account = String(item.account || "").trim();
  const mobile = normalizeMainlandChinaMobile(item.mobile || "");
  const password = String(item.password || "");
  const passwordHash = String(item.passwordHash || "").trim();
  const nickname = String(item.nickname || "").trim();
  const isProduction = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";

  if (!account || !mobile || !/^1\d{10}$/.test(mobile)) {
    return null;
  }

  if (isProduction && !passwordHash) {
    return null;
  }

  if (!password && !passwordHash) {
    return null;
  }

  return {
    account,
    mobile,
    password,
    passwordHash,
    nickname: nickname || "商城用户"
  };
}

function parseAccountUsersFromEnv() {
  const raw = String(process.env.STOREFRONT_ACCOUNT_LOGIN_USERS || "").trim();

  if (!raw) {
    return [];
  }

  try {
    const list = JSON.parse(raw);

    if (!Array.isArray(list)) {
      return [];
    }

    return list
      .map((item) => normalizeAccountLoginUser(item))
      .filter((item) => !!item);
  } catch (error) {
    console.warn("[storefront-auth] STOREFRONT_ACCOUNT_LOGIN_USERS 解析失败，已忽略", error.message);
    return [];
  }
}

function getAccountLoginUsers() {
  const configuredUsers = parseAccountUsersFromEnv();

  if (configuredUsers.length > 0) {
    return configuredUsers;
  }

  if (String(process.env.NODE_ENV || "").trim().toLowerCase() === "production") {
    return [];
  }

  return DEFAULT_NON_PRODUCTION_ACCOUNT_USERS;
}

function isAccountPasswordLoginEnabled() {
  return false;
}

function resolveAccountLoginUser(payload = {}, createStorefrontError) {
  const accountInput = String(payload.account || payload.mobile || "").trim();
  const passwordInput = String(payload.password || "");

  if (!accountInput) {
    throw createStorefrontError("请输入账号或手机号", 400, "ACCOUNT_REQUIRED");
  }

  if (!passwordInput) {
    throw createStorefrontError("请输入登录密码", 400, "ACCOUNT_PASSWORD_REQUIRED");
  }

  const users = getAccountLoginUsers();

  if (!users.length) {
    throw createStorefrontError("当前环境暂未开启账号登录", 400, "ACCOUNT_LOGIN_DISABLED");
  }

  const matched = users.find((item) => item.account === accountInput || item.mobile === accountInput);
  let isPasswordValid = false;

  if (matched && matched.passwordHash) {
    if (!bcrypt || typeof bcrypt.compareSync !== "function") {
      throw createStorefrontError("服务缺少密码校验依赖，请联系管理员", 500, "ACCOUNT_HASH_VERIFY_UNAVAILABLE");
    }

    try {
      isPasswordValid = bcrypt.compareSync(passwordInput, matched.passwordHash);
    } catch {
      isPasswordValid = false;
    }
  } else if (matched) {
    isPasswordValid = matched.password === passwordInput;
  }

  if (!matched || !isPasswordValid) {
    throw createStorefrontError("账号或密码错误", 400, "ACCOUNT_PASSWORD_INVALID");
  }

  return matched;
}

function issueMobileLoginCode(rawMobile, createStorefrontError) {
  const mobile = normalizeMainlandChinaMobile(rawMobile);
  const now = Date.now();
  const existing = mobileCodeStore.get(mobile);

  ensureValidMainlandChinaMobile(mobile, createStorefrontError);

  if (existing && existing.expiresAt > now) {
    const remainingCooldownSeconds = Math.ceil((existing.sentAt + MOBILE_CODE_RESEND_INTERVAL_MS - now) / 1000);

    if (remainingCooldownSeconds > 0) {
      throw createStorefrontError(
        `验证码发送过于频繁，请在 ${remainingCooldownSeconds} 秒后重试`,
        429,
        "MOBILE_CODE_RESEND_TOO_FAST"
      );
    }
  }

  const code = normalizeSixDigitCode(_randomCodeGenerator());

  if (!/^\d{6}$/.test(code)) {
    throw createStorefrontError("验证码服务异常，请稍后重试", 500, "MOBILE_CODE_GENERATION_FAILED");
  }

  const sentAt = Date.now();

  mobileCodeStore.set(mobile, {
    code,
    sentAt,
    expiresAt: sentAt + MOBILE_CODE_EXPIRE_MS,
    verifyAttempts: 0
  });

  const payload = {
    ok: true,
    mobile: maskMobile(mobile),
    cooldownSeconds: Math.floor(MOBILE_CODE_RESEND_INTERVAL_MS / 1000),
    expireSeconds: Math.floor(MOBILE_CODE_EXPIRE_MS / 1000)
  };

  if (String(process.env.NODE_ENV || "").trim().toLowerCase() !== "production") {
    payload.debugCode = code;
  }

  return payload;
}

function verifyMobileLoginCode(rawMobile, rawCode, createStorefrontError) {
  const mobile = normalizeMainlandChinaMobile(rawMobile);
  const code = normalizeSixDigitCode(rawCode);
  const now = Date.now();
  const record = mobileCodeStore.get(mobile);

  ensureValidMainlandChinaMobile(mobile, createStorefrontError);

  if (!/^\d{6}$/.test(code)) {
    throw createStorefrontError("请输入 6 位验证码", 400, "MOBILE_CODE_INVALID");
  }

  if (!record) {
    throw createStorefrontError("请先获取验证码", 400, "MOBILE_CODE_REQUIRED");
  }

  if (record.expiresAt <= now) {
    mobileCodeStore.delete(mobile);
    throw createStorefrontError("验证码已过期，请重新获取", 400, "MOBILE_CODE_EXPIRED");
  }

  if (record.code !== code) {
    record.verifyAttempts = Number(record.verifyAttempts || 0) + 1;

    if (record.verifyAttempts >= MOBILE_CODE_MAX_VERIFY_ATTEMPTS) {
      mobileCodeStore.delete(mobile);
      throw createStorefrontError("验证码错误次数过多，请重新获取", 400, "MOBILE_CODE_RETRY_LIMIT");
    }

    mobileCodeStore.set(mobile, record);
    throw createStorefrontError("验证码错误，请重试", 400, "MOBILE_CODE_MISMATCH");
  }

  mobileCodeStore.delete(mobile);

  return {
    mobile
  };
}

function isMockWechatLoginAllowed(options = {}) {
  if (typeof options.allowMockWechatLogin === "boolean") {
    return options.allowMockWechatLogin;
  }

  const envOverride = normalizeBooleanEnv(process.env.ALLOW_MOCK_WECHAT_LOGIN);

  if (envOverride !== null) {
    return envOverride;
  }

  return String(process.env.NODE_ENV || "").trim().toLowerCase() !== "production";
}

function resolveStorefrontSessionLoginType(payload = {}, createStorefrontError, options = {}) {
  const loginType = String(
    payload.loginType || (isMockWechatLoginAllowed(options) ? "mock_wechat" : "wechat_miniprogram")
  ).trim().toLowerCase();

  if (loginType === "mock_wechat") {
    if (isMockWechatLoginAllowed(options)) {
      return loginType;
    }

    throw createStorefrontError(
      "当前环境已关闭 mock 登录，请使用微信小程序真实登录",
      400,
      "MOCK_WECHAT_LOGIN_DISABLED"
    );
  }

  if (loginType === "wechat_miniprogram") {
    return loginType;
  }

  throw createStorefrontError("暂不支持当前登录方式", 400, "LOGIN_TYPE_UNSUPPORTED");
}

const _isNonProduction = () => String(process.env.NODE_ENV || "").trim().toLowerCase() !== "production";

function resetMobileLoginCodeStoreForTest() {
  if (!_isNonProduction()) return;
  mobileCodeStore.clear();
  _randomCodeGenerator = () => String(Math.floor(100000 + Math.random() * 900000));
}

function setMobileLoginCodeGeneratorForTest(generator) {
  if (!_isNonProduction()) return;
  if (typeof generator !== "function") {
    return;
  }

  _randomCodeGenerator = generator;
}

const _testOnlyExports = _isNonProduction()
  ? { resetMobileLoginCodeStoreForTest, setMobileLoginCodeGeneratorForTest }
  : {};

module.exports = {
  isMockWechatLoginAllowed,
  normalizeMainlandChinaMobile,
  isAccountPasswordLoginEnabled,
  resolveAccountLoginUser,
  issueMobileLoginCode,
  verifyMobileLoginCode,
  resolveStorefrontSessionLoginType,
  ..._testOnlyExports
};
