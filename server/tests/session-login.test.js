const test = require("node:test");
const assert = require("node:assert/strict");

let bcrypt = null;

try {
  bcrypt = require("bcryptjs");
} catch {
  bcrypt = null;
}

const {
  isMockWechatLoginAllowed,
  resolveStorefrontSessionLoginType,
  issueMobileLoginCode,
  verifyMobileLoginCode,
  resolveAccountLoginUser,
  resetMobileLoginCodeStoreForTest,
  setMobileLoginCodeGeneratorForTest
} = require("../src/repositories/storefront/session-login");

function createStorefrontError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

test.afterEach(() => {
  resetMobileLoginCodeStoreForTest();
});

test("session login helper normalizes supported login types", () => {
  assert.equal(resolveStorefrontSessionLoginType({}, createStorefrontError, {
    allowMockWechatLogin: true
  }), "mock_wechat");
  assert.equal(resolveStorefrontSessionLoginType({
    loginType: "  WECHAT_MINIPROGRAM  "
  }, createStorefrontError), "wechat_miniprogram");
});

test("session login helper rejects unsupported login types", () => {
  const unsupportedLoginTypes = ["email", "mobile_code", "account_password"];

  unsupportedLoginTypes.forEach((loginType) => {
    assert.throws(
      () => resolveStorefrontSessionLoginType({
        loginType
      }, createStorefrontError),
      /暂不支持当前登录方式/
    );
  });
});

test("session login helper rejects mock login when current environment disables it", () => {
  assert.throws(
    () => resolveStorefrontSessionLoginType({
      loginType: "mock_wechat"
    }, createStorefrontError, {
      allowMockWechatLogin: false
    }),
    /当前环境已关闭 mock 登录/
  );
});

test("session login helper falls back to real wechat login when mock login is disabled", () => {
  assert.equal(resolveStorefrontSessionLoginType({}, createStorefrontError, {
    allowMockWechatLogin: false
  }), "wechat_miniprogram");
});

test("session login helper exposes whether mock login is allowed", () => {
  assert.equal(isMockWechatLoginAllowed({
    allowMockWechatLogin: true
  }), true);
  assert.equal(isMockWechatLoginAllowed({
    allowMockWechatLogin: false
  }), false);
});

test("mobile login code can be issued and verified once", () => {
  setMobileLoginCodeGeneratorForTest(() => "123456");

  const issued = issueMobileLoginCode("13800006688", createStorefrontError);

  assert.equal(issued.ok, true);
  assert.equal(issued.debugCode, "123456");

  const result = verifyMobileLoginCode("13800006688", "123456", createStorefrontError);

  assert.equal(result.mobile, "13800006688");

  assert.throws(
    () => verifyMobileLoginCode("13800006688", "123456", createStorefrontError),
    /请先获取验证码/
  );
});

test("mobile login code rejects invalid values", () => {
  assert.throws(
    () => issueMobileLoginCode("123", createStorefrontError),
    /11 位手机号/
  );

  assert.throws(
    () => verifyMobileLoginCode("13800006688", "abc123", createStorefrontError),
    /6 位验证码/
  );
});

test("account login helper validates default non-production account credentials", () => {
  const user = resolveAccountLoginUser({
    account: "demo",
    password: "Demo@123456"
  }, createStorefrontError);

  assert.equal(user.mobile, "13800006688");

  assert.throws(
    () => resolveAccountLoginUser({
      account: "demo",
      password: "wrong"
    }, createStorefrontError),
    /账号或密码错误/
  );
});

test("account login helper supports passwordHash users", {
  skip: !bcrypt
}, () => {
  const previousUsersEnv = process.env.STOREFRONT_ACCOUNT_LOGIN_USERS;
  const previousNodeEnv = process.env.NODE_ENV;

  process.env.NODE_ENV = "production";
  process.env.STOREFRONT_ACCOUNT_LOGIN_USERS = JSON.stringify([
    {
      account: "prod_user",
      mobile: "13800009988",
      passwordHash: bcrypt.hashSync("Prod@123456", 10),
      nickname: "生产账号"
    }
  ]);

  try {
    const user = resolveAccountLoginUser({
      account: "prod_user",
      password: "Prod@123456"
    }, createStorefrontError);

    assert.equal(user.mobile, "13800009988");

    assert.throws(
      () => resolveAccountLoginUser({
        account: "prod_user",
        password: "wrong-password"
      }, createStorefrontError),
      /账号或密码错误/
    );
  } finally {
    if (typeof previousUsersEnv === "undefined") {
      delete process.env.STOREFRONT_ACCOUNT_LOGIN_USERS;
    } else {
      process.env.STOREFRONT_ACCOUNT_LOGIN_USERS = previousUsersEnv;
    }

    if (typeof previousNodeEnv === "undefined") {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});
