const https = require("https");
const { createStorefrontError } = require("../modules/storefront/errors");

let exchangeMiniProgramCodeOverride = null;
let getWechatPhoneNumberOverride = null;
let accessTokenCache = {
  token: "",
  expiresAt: 0
};
let pendingAccessTokenPromise = null;

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

function resolveWechatPhoneErrorMessage(payload = {}) {
  const errCode = Number(payload.errcode || 0);
  const errMsg = String(payload.errmsg || "").trim();

  if (errCode === 40013) {
    return "当前小程序 AppID 与手机号授权来源不匹配，请检查正式环境配置";
  }

  if (errCode === 40029) {
    return "手机号授权 code 无效，请重新点击按钮授权";
  }

  if (errCode === 45011) {
    return "手机号授权请求过于频繁，请稍后再试";
  }

  if (errCode) {
    return `获取手机号失败：${errMsg || `errcode=${errCode}`}`;
  }

  return "获取手机号失败，请稍后重试";
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = typeof url === "string" ? new URL(url) : url;
    const method = String(options.method || "GET").trim().toUpperCase() || "GET";
    const body = typeof options.body === "undefined" ? null : JSON.stringify(options.body || {});
    const request = https.request(requestUrl, {
      method,
      headers: {
        Accept: "application/json",
        ...(body
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body)
            }
          : {}),
        ...(options.headers || {})
      }
    }, (response) => {
      let raw = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(raw || "{}"));
        } catch (error) {
          reject(createStorefrontError(
            options.badResponseMessage || "微信返回了无法解析的数据",
            502,
            options.badResponseCode || "WECHAT_BAD_RESPONSE"
          ));
        }
      });
    }).on("error", () => {
      reject(createStorefrontError(
        options.networkErrorMessage || "微信请求失败，请检查服务网络或稍后重试",
        502,
        options.errorCode || "WECHAT_REQUEST_FAILED"
      ));
    });

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

async function getWechatAccessToken() {
  if (accessTokenCache.token && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  if (pendingAccessTokenPromise) {
    return pendingAccessTokenPromise;
  }

  pendingAccessTokenPromise = (async () => {
    const config = readWechatAuthConfig();

    if (!config.appId || !config.appSecret) {
      throw createStorefrontError(
        "缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET，暂时无法启用正式微信能力",
        503,
        "WECHAT_LOGIN_NOT_CONFIGURED"
      );
    }

    const url = new URL("https://api.weixin.qq.com/cgi-bin/token");

    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", config.appId);
    url.searchParams.set("secret", config.appSecret);

    const payload = await requestJson(url, {
      networkErrorMessage: "获取微信 access_token 失败，请检查服务网络或稍后重试",
      errorCode: "WECHAT_ACCESS_TOKEN_REQUEST_FAILED",
      badResponseMessage: "获取微信 access_token 返回了无法解析的数据",
      badResponseCode: "WECHAT_ACCESS_TOKEN_BAD_RESPONSE"
    });
    const errCode = Number(payload.errcode || 0);

    if (errCode) {
      throw createStorefrontError(
        `获取微信 access_token 失败：${String(payload.errmsg || `errcode=${errCode}`).trim() || errCode}`,
        502,
        "WECHAT_ACCESS_TOKEN_FAILED"
      );
    }

    const accessToken = String(payload.access_token || "").trim();
    const expiresInSeconds = Math.max(60, Number(payload.expires_in || 7200));

    if (!accessToken) {
      throw createStorefrontError("获取微信 access_token 失败，返回结果缺少 access_token", 502, "WECHAT_ACCESS_TOKEN_MISSING");
    }

    accessTokenCache = {
      token: accessToken,
      expiresAt: Date.now() + Math.max(60, expiresInSeconds - 120) * 1000
    };

    return accessToken;
  })().finally(() => {
    pendingAccessTokenPromise = null;
  });

  return pendingAccessTokenPromise;
}

async function exchangeMiniProgramCode(code) {
  const normalizedCode = String(code || "").trim();

  if (!normalizedCode) {
    throw createStorefrontError("缺少 wx.login 返回的 code，暂时无法继续微信登录", 400, "WECHAT_LOGIN_CODE_REQUIRED");
  }

  if (typeof exchangeMiniProgramCodeOverride === "function") {
    return exchangeMiniProgramCodeOverride(normalizedCode);
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

  const payload = await requestJson(url, {
    networkErrorMessage: "微信登录请求失败，请检查服务网络或稍后重试",
    errorCode: "WECHAT_LOGIN_REQUEST_FAILED",
    badResponseMessage: "微信登录返回了无法解析的数据",
    badResponseCode: "WECHAT_LOGIN_BAD_RESPONSE"
  });

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

async function getWechatPhoneNumber(code) {
  const normalizedCode = String(code || "").trim();

  if (!normalizedCode) {
    throw createStorefrontError("缺少手机号授权 code，请重新点击按钮授权", 400, "WECHAT_PHONE_CODE_REQUIRED");
  }

  if (typeof getWechatPhoneNumberOverride === "function") {
    return getWechatPhoneNumberOverride(normalizedCode);
  }

  const accessToken = await getWechatAccessToken();
  const url = new URL("https://api.weixin.qq.com/wxa/business/getuserphonenumber");

  url.searchParams.set("access_token", accessToken);

  const payload = await requestJson(url, {
    method: "POST",
    body: {
      code: normalizedCode
    },
    networkErrorMessage: "获取手机号失败，请检查服务网络或稍后重试",
    errorCode: "WECHAT_PHONE_NUMBER_REQUEST_FAILED",
    badResponseMessage: "获取手机号返回了无法解析的数据",
    badResponseCode: "WECHAT_PHONE_NUMBER_BAD_RESPONSE"
  });
  const errCode = Number(payload.errcode || 0);

  if (errCode) {
    throw createStorefrontError(
      resolveWechatPhoneErrorMessage(payload),
      errCode === 40013 || errCode === 40029 ? 400 : 502,
      "WECHAT_PHONE_NUMBER_FAILED"
    );
  }

  const phoneInfo = payload.phone_info || {};
  const phoneNumber = String(phoneInfo.phoneNumber || phoneInfo.purePhoneNumber || "").trim();

  if (!phoneNumber) {
    throw createStorefrontError("获取手机号成功但返回结果缺少手机号", 502, "WECHAT_PHONE_NUMBER_MISSING");
  }

  return {
    phoneNumber,
    purePhoneNumber: String(phoneInfo.purePhoneNumber || "").trim(),
    countryCode: String(phoneInfo.countryCode || "").trim()
  };
}

function setExchangeMiniProgramCodeOverrideForTest(handler) {
  exchangeMiniProgramCodeOverride = typeof handler === "function" ? handler : null;
}

function resetExchangeMiniProgramCodeOverrideForTest() {
  exchangeMiniProgramCodeOverride = null;
}

function setGetWechatPhoneNumberOverrideForTest(handler) {
  getWechatPhoneNumberOverride = typeof handler === "function" ? handler : null;
}

function resetGetWechatPhoneNumberOverrideForTest() {
  getWechatPhoneNumberOverride = null;
}

function resetWechatAccessTokenCacheForTest() {
  accessTokenCache = {
    token: "",
    expiresAt: 0
  };
  pendingAccessTokenPromise = null;
}

module.exports = {
  readWechatAuthConfig,
  isWechatAuthConfigured,
  exchangeMiniProgramCode,
  getWechatAccessToken,
  getWechatPhoneNumber,
  setExchangeMiniProgramCodeOverrideForTest,
  resetExchangeMiniProgramCodeOverrideForTest,
  setGetWechatPhoneNumberOverrideForTest,
  resetGetWechatPhoneNumberOverrideForTest,
  resetWechatAccessTokenCacheForTest
};
