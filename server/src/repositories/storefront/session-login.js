function resolveStorefrontSessionLoginType(payload = {}, createStorefrontError) {
  const loginType = String(payload.loginType || "mock_wechat").trim().toLowerCase();

  if (loginType === "mock_wechat" || loginType === "wechat_miniprogram") {
    return loginType;
  }

  throw createStorefrontError("暂不支持当前登录方式", 400, "LOGIN_TYPE_UNSUPPORTED");
}

module.exports = {
  resolveStorefrontSessionLoginType
};
