const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveStorefrontSessionLoginType } = require("../src/repositories/storefront/session-login");

function createStorefrontError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

test("session login helper normalizes supported login types", () => {
  assert.equal(resolveStorefrontSessionLoginType({}, createStorefrontError), "mock_wechat");
  assert.equal(resolveStorefrontSessionLoginType({
    loginType: "  WECHAT_MINIPROGRAM  "
  }, createStorefrontError), "wechat_miniprogram");
});

test("session login helper rejects unsupported login types", () => {
  assert.throws(
    () => resolveStorefrontSessionLoginType({
      loginType: "email"
    }, createStorefrontError),
    /暂不支持当前登录方式/
  );
});
