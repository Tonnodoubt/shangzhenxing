const https = require("https");
const { createStorefrontError } = require("../modules/storefront/errors");

function readWechatAuthConfig() {
  return {
    appId: String(process.env.WECHAT_APP_ID || "").trim(),
    appSecret: String(process.env.WECHAT_APP_SECRET || "").trim()
  };
}

function isWechatAuthConfigured() {
  const config = readWechatAuthConfig();

  return !!(config.appId && config.appSecret);
}

function resolveWechatErrorMessage(payload = {}) {
  const errCode = Number(payload.errcode || 0);
  const errMsg = String(payload.errmsg || "").trim();

  if (errCode === 40029) {
    return "微信登录 code 无效，请重新发起登录";
  }

  if (errCode === 45011) {
    return "微信登录请求过于频繁，请稍后再试";
  }

  if (errCode) {
    return `微信登录失败：${errMsg || `errcode=${errCode}`}`;
  }

  return "微信登录失败，请稍后重试";
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let raw = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(raw || "{}"));
        } catch (error) {
          reject(createStorefrontError("微信登录返回了无法解析的数据", 502, "WECHAT_LOGIN_BAD_RESPONSE"));
        }
      });
    }).on("error", () => {
      reject(createStorefrontError("微信登录请求失败，请检查服务网络或稍后重试", 502, "WECHAT_LOGIN_REQUEST_FAILED"));
    });
  });
}

async function exchangeMiniProgramCode(code) {
  const normalizedCode = String(code || "").trim();

  if (!normalizedCode) {
    throw createStorefrontError("缺少 wx.login 返回的 code，暂时无法继续微信登录", 400, "WECHAT_LOGIN_CODE_REQUIRED");
  }

  const config = readWechatAuthConfig();

  if (!config.appId || !config.appSecret) {
    throw createStorefrontError(
      "缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET，暂时无法启用真实微信登录",
      503,
      "WECHAT_LOGIN_NOT_CONFIGURED"
    );
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");

  url.searchParams.set("appid", config.appId);
  url.searchParams.set("secret", config.appSecret);
  url.searchParams.set("js_code", normalizedCode);
  url.searchParams.set("grant_type", "authorization_code");

  const payload = await requestJson(url);

  if (Number(payload.errcode || 0)) {
    throw createStorefrontError(
      resolveWechatErrorMessage(payload),
      502,
      "WECHAT_LOGIN_FAILED"
    );
  }

  if (!payload.openid) {
    throw createStorefrontError("微信登录成功返回异常，缺少 openid", 502, "WECHAT_LOGIN_OPENID_MISSING");
  }

  return {
    openId: String(payload.openid || "").trim(),
    unionId: String(payload.unionid || "").trim(),
    sessionKey: String(payload.session_key || "").trim()
  };
}

module.exports = {
  readWechatAuthConfig,
  isWechatAuthConfigured,
  exchangeMiniProgramCode
};
