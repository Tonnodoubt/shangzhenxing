const crypto = require("crypto");
const https = require("https");
const { createStorefrontError } = require("../modules/storefront/errors");

let prepareWechatJsapiPaymentOverride = null;
let parseWechatPayNotifyOverride = null;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizePemText(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (raw.includes("\\n")) {
    return raw.replace(/\\n/g, "\n");
  }

  return raw;
}

function readWechatPayConfig() {
  return {
    appId: normalizeText(process.env.WECHAT_APP_ID),
    mchId: normalizeText(process.env.WECHAT_PAY_MCH_ID),
    serialNo: normalizeText(process.env.WECHAT_PAY_SERIAL_NO),
    privateKey: normalizePemText(process.env.WECHAT_PAY_PRIVATE_KEY),
    notifyUrl: normalizeText(process.env.WECHAT_PAY_NOTIFY_URL),
    apiV3Key: normalizeText(process.env.WECHAT_PAY_API_V3_KEY),
    platformPublicKey: normalizePemText(process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY),
    platformSerial: normalizeText(process.env.WECHAT_PAY_PLATFORM_SERIAL)
  };
}

function isWechatPayConfigured(config = readWechatPayConfig()) {
  return !!(
    config.appId
    && config.mchId
    && config.serialNo
    && config.privateKey
    && config.notifyUrl
    && config.apiV3Key
  );
}

function isWechatPayNotifyConfigured(config = readWechatPayConfig()) {
  return !!(config.apiV3Key && config.platformPublicKey);
}

function assertWechatPayConfigured(config = readWechatPayConfig()) {
  if (isWechatPayConfigured(config)) {
    return config;
  }

  throw createStorefrontError(
    "微信支付配置不完整，请先补齐商户参数",
    503,
    "PAYMENT_PROVIDER_NOT_READY"
  );
}

function assertWechatPayNotifyConfigured(config = readWechatPayConfig()) {
  if (isWechatPayNotifyConfigured(config)) {
    return config;
  }

  throw createStorefrontError(
    "微信支付回调配置不完整，请补齐平台公钥与 APIv3 Key",
    503,
    "PAYMENT_PROVIDER_NOT_READY"
  );
}

function buildSignatureMessage(parts = []) {
  return parts.map((item) => String(item || "")).join("\n") + "\n";
}

function signWithPrivateKey(privateKey, message) {
  try {
    return crypto.createSign("RSA-SHA256").update(message).sign(privateKey, "base64");
  } catch (_error) {
    throw createStorefrontError("微信支付签名失败，请检查商户私钥配置", 503, "PAYMENT_PROVIDER_NOT_READY");
  }
}

function verifyWithPublicKey(publicKey, message, signature) {
  try {
    return crypto.createVerify("RSA-SHA256")
      .update(message)
      .verify(publicKey, signature, "base64");
  } catch (_error) {
    return false;
  }
}

function buildAuthorizationHeader({
  mchId,
  serialNo,
  privateKey,
  method,
  pathnameWithQuery,
  timestamp,
  nonceStr,
  bodyText
}) {
  const signingText = buildSignatureMessage([
    String(method || "POST").toUpperCase(),
    pathnameWithQuery,
    String(timestamp || ""),
    String(nonceStr || ""),
    bodyText || ""
  ]);
  const signature = signWithPrivateKey(privateKey, signingText);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: String(options.method || "GET").trim().toUpperCase() || "GET",
      headers: {
        Accept: "application/json",
        ...(options.headers || {})
      }
    }, (response) => {
      let raw = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        let payload = {};

        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch (_error) {
          reject(createStorefrontError("微信支付返回了无法解析的数据", 502, "PAYMENT_PROVIDER_RESPONSE_INVALID"));
          return;
        }

        if (Number(response.statusCode || 0) >= 400) {
          const detail = String(payload.message || payload.code || "").trim();

          reject(createStorefrontError(
            `微信支付下单失败${detail ? `：${detail}` : ""}`,
            502,
            "PAYMENT_PROVIDER_REQUEST_FAILED"
          ));
          return;
        }

        resolve(payload);
      });
    });

    request.on("error", () => {
      reject(createStorefrontError("微信支付请求失败，请检查网络与商户配置", 502, "PAYMENT_PROVIDER_REQUEST_FAILED"));
    });

    if (options.bodyText) {
      request.write(options.bodyText);
    }

    request.end();
  });
}

function buildWxRequestPaymentPayload({
  appId,
  privateKey,
  prepayId
}) {
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const packageValue = `prepay_id=${prepayId}`;
  const paySignMessage = buildSignatureMessage([
    appId,
    timeStamp,
    nonceStr,
    packageValue
  ]);
  const paySign = signWithPrivateKey(privateKey, paySignMessage);

  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: "RSA",
    paySign
  };
}

function readHeader(headers = {}, key) {
  const exact = headers[key];

  if (exact != null) {
    return normalizeText(exact);
  }

  return normalizeText(headers[String(key || "").toLowerCase()]);
}

function parseWechatPayNotifyBody(input = {}) {
  if (input.body && typeof input.body === "object" && !Array.isArray(input.body)) {
    return input.body;
  }

  const rawBody = normalizeText(input.rawBody);

  if (!rawBody) {
    throw createStorefrontError("微信支付回调缺少请求体", 400, "PAYMENT_REQUEST_INVALID");
  }

  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    throw createStorefrontError("微信支付回调请求体不是合法 JSON", 400, "PAYMENT_REQUEST_INVALID");
  }
}

function decryptWechatPayResource(resource = {}, apiV3Key = "") {
  const algorithm = normalizeText(resource.algorithm).toUpperCase();
  const ciphertext = normalizeText(resource.ciphertext);
  const nonce = normalizeText(resource.nonce);
  const associatedData = normalizeText(resource.associated_data);

  if (algorithm !== "AEAD_AES_256_GCM") {
    throw createStorefrontError("微信支付回调加密算法不受支持", 400, "PAYMENT_REQUEST_INVALID");
  }

  if (!ciphertext || !nonce) {
    throw createStorefrontError("微信支付回调缺少加密资源字段", 400, "PAYMENT_REQUEST_INVALID");
  }

  const keyBuffer = Buffer.from(String(apiV3Key || ""), "utf8");

  if (keyBuffer.length !== 32) {
    throw createStorefrontError("WECHAT_PAY_API_V3_KEY 长度必须为 32 字节", 503, "PAYMENT_PROVIDER_NOT_READY");
  }

  let decodedCiphertext = Buffer.alloc(0);

  try {
    decodedCiphertext = Buffer.from(ciphertext, "base64");
  } catch (_error) {
    throw createStorefrontError("微信支付回调密文格式无效", 400, "PAYMENT_REQUEST_INVALID");
  }

  if (decodedCiphertext.length <= 16) {
    throw createStorefrontError("微信支付回调密文长度异常", 400, "PAYMENT_REQUEST_INVALID");
  }

  const encrypted = decodedCiphertext.subarray(0, decodedCiphertext.length - 16);
  const authTag = decodedCiphertext.subarray(decodedCiphertext.length - 16);

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, Buffer.from(nonce, "utf8"));
    decipher.setAuthTag(authTag);

    if (associatedData) {
      decipher.setAAD(Buffer.from(associatedData, "utf8"));
    }

    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString("utf8");

    return plaintext ? JSON.parse(plaintext) : {};
  } catch (_error) {
    throw createStorefrontError("微信支付回调解密失败，请检查 APIv3 Key", 400, "PAYMENT_REQUEST_INVALID");
  }
}

function parseWechatPayNotification(input = {}) {
  if (typeof parseWechatPayNotifyOverride === "function") {
    return parseWechatPayNotifyOverride(input);
  }

  const config = assertWechatPayNotifyConfigured(readWechatPayConfig());
  const headers = input.headers || {};
  const timestamp = readHeader(headers, "wechatpay-timestamp");
  const nonce = readHeader(headers, "wechatpay-nonce");
  const signature = readHeader(headers, "wechatpay-signature");
  const serial = readHeader(headers, "wechatpay-serial");
  const rawBody = String(input.rawBody || "");

  if (!timestamp || !nonce || !signature || !serial) {
    throw createStorefrontError("微信支付回调请求头不完整", 400, "PAYMENT_REQUEST_INVALID");
  }

  if (!rawBody) {
    throw createStorefrontError("微信支付回调缺少原始请求体", 400, "PAYMENT_REQUEST_INVALID");
  }

  if (config.platformSerial && serial !== config.platformSerial) {
    throw createStorefrontError("微信支付回调证书序列号不匹配", 400, "PAYMENT_REQUEST_INVALID");
  }

  const signatureMessage = buildSignatureMessage([timestamp, nonce, rawBody]);

  if (!verifyWithPublicKey(config.platformPublicKey, signatureMessage, signature)) {
    throw createStorefrontError("微信支付回调验签失败", 400, "PAYMENT_REQUEST_INVALID");
  }

  const payload = parseWechatPayNotifyBody(input);
  const resource = payload && typeof payload.resource === "object" ? payload.resource : null;

  if (!resource) {
    throw createStorefrontError("微信支付回调缺少 resource 字段", 400, "PAYMENT_REQUEST_INVALID");
  }

  const transaction = decryptWechatPayResource(resource, config.apiV3Key);
  const outTradeNo = normalizeText(transaction.out_trade_no || transaction.outTradeNo);
  const tradeState = normalizeText(transaction.trade_state || transaction.tradeState).toUpperCase();
  const transactionId = normalizeText(transaction.transaction_id || transaction.transactionId);
  const successTime = normalizeText(transaction.success_time || transaction.successTime);

  if (!outTradeNo || !tradeState) {
    throw createStorefrontError("微信支付回调缺少订单关键字段", 400, "PAYMENT_REQUEST_INVALID");
  }

  return {
    notifyId: normalizeText(payload.id),
    eventType: normalizeText(payload.event_type || payload.eventType),
    summary: normalizeText(payload.summary),
    outTradeNo,
    tradeState,
    transactionId,
    successTime,
    amount: transaction && typeof transaction.amount === "object" ? transaction.amount : null,
    transaction
  };
}

async function prepareWechatJsapiPayment(input = {}) {
  if (typeof prepareWechatJsapiPaymentOverride === "function") {
    return prepareWechatJsapiPaymentOverride(input);
  }

  const config = assertWechatPayConfigured(readWechatPayConfig());
  const outTradeNo = normalizeText(input.outTradeNo);
  const payerOpenId = normalizeText(input.payerOpenId);
  const description = normalizeText(input.description || `商城订单 ${outTradeNo}`);
  const notifyUrl = normalizeText(input.notifyUrl || config.notifyUrl);
  const totalAmountFen = Math.max(0, Number(input.totalAmountFen || 0));

  if (!outTradeNo) {
    throw createStorefrontError("微信支付缺少订单号", 400, "PAYMENT_REQUEST_INVALID");
  }

  if (!payerOpenId) {
    throw createStorefrontError("当前账号缺少微信 openId，请重新登录后重试", 409, "PAYMENT_OPENID_REQUIRED");
  }

  if (!Number.isFinite(totalAmountFen) || totalAmountFen <= 0) {
    throw createStorefrontError("微信支付金额无效", 400, "PAYMENT_REQUEST_INVALID");
  }

  const requestBody = {
    appid: config.appId,
    mchid: config.mchId,
    description: description || `商城订单 ${outTradeNo}`,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: {
      total: Math.round(totalAmountFen),
      currency: "CNY"
    },
    payer: {
      openid: payerOpenId
    }
  };

  if (input.attach) {
    requestBody.attach = String(input.attach);
  }

  const bodyText = JSON.stringify(requestBody);
  const pathnameWithQuery = "/v3/pay/transactions/jsapi";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const authorization = buildAuthorizationHeader({
    mchId: config.mchId,
    serialNo: config.serialNo,
    privateKey: config.privateKey,
    method: "POST",
    pathnameWithQuery,
    timestamp,
    nonceStr,
    bodyText
  });
  const payload = await requestJson(`https://api.mch.weixin.qq.com${pathnameWithQuery}`, {
    method: "POST",
    bodyText,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      "User-Agent": "wechat-mini-shop-server/0.1.0"
    }
  });
  const prepayId = normalizeText(payload.prepay_id);

  if (!prepayId) {
    throw createStorefrontError("微信支付下单成功但缺少 prepay_id", 502, "PAYMENT_PROVIDER_RESPONSE_INVALID");
  }

  return {
    provider: "wechat_jsapi",
    prepayId,
    requestPayment: buildWxRequestPaymentPayload({
      appId: config.appId,
      privateKey: config.privateKey,
      prepayId
    }),
    rawResponse: payload
  };
}

function setPrepareWechatJsapiPaymentOverride(handler) {
  prepareWechatJsapiPaymentOverride = typeof handler === "function" ? handler : null;
}

function setParseWechatPayNotifyOverride(handler) {
  parseWechatPayNotifyOverride = typeof handler === "function" ? handler : null;
}

function resetWechatPayOverrides() {
  prepareWechatJsapiPaymentOverride = null;
  parseWechatPayNotifyOverride = null;
}

module.exports = {
  readWechatPayConfig,
  isWechatPayConfigured,
  isWechatPayNotifyConfigured,
  prepareWechatJsapiPayment,
  parseWechatPayNotification,
  setPrepareWechatJsapiPaymentOverride,
  setParseWechatPayNotifyOverride,
  resetWechatPayOverrides
};
