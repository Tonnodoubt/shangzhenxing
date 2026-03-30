const envConfig = require("../config/env");
const sessionStore = require("./session");

function buildError(message, extra = {}) {
  const error = new Error(message || "请求失败");

  Object.keys(extra || {}).forEach((key) => {
    error[key] = extra[key];
  });

  return error;
}

function shouldLogRequestDebug() {
  return envConfig.enableRequestDebug !== false;
}

function logRequest(level, stage, payload = {}) {
  if (!shouldLogRequestDebug()) {
    return;
  }

  const logger = console[level] || console.log;

  logger.call(console, `[mall-request][${stage}]`, payload);
}

function getRequestId(headers = {}) {
  return headers["X-Request-Id"] || headers["x-request-id"] || "";
}

function buildRequestFailMessage(error) {
  const errMsg = error && error.errMsg ? error.errMsg : "";

  if (errMsg.indexOf("timeout") > -1) {
    return "请求超时，请确认本地服务已启动、apiBaseUrl 可访问，并重新编译小程序";
  }

  if (errMsg) {
    return `网络请求失败：${errMsg}`;
  }

  return "网络请求失败";
}

function normalizePayload(payload, statusCode) {
  if (payload && payload.success) {
    return payload.data;
  }

  const normalizedStatusCode = Number(statusCode || (payload && payload.statusCode) || 0);
  const message = payload && payload.message ? payload.message : "服务返回异常";

  if (normalizedStatusCode === 401) {
    throw buildError(message, {
      code: "UNAUTHORIZED",
      statusCode: 401
    });
  }

  throw buildError(message, {
    statusCode: normalizedStatusCode || 500
  });
}

function buildRequestHeaders(options = {}) {
  const sessionToken = options.skipAuthorization ? "" : sessionStore.getSessionToken();

  return {
    "Content-Type": "application/json",
    ...(sessionToken
      ? {
          Authorization: `Bearer ${sessionToken}`
        }
      : {}),
    ...(options.header || {})
  };
}

function requestByHttp(options) {
  return new Promise((resolve, reject) => {
    const method = options.method || "GET";
    const url = `${envConfig.apiBaseUrl}${options.url}`;
    const data = options.data || {};
    const timeout = options.timeout || envConfig.requestTimeout;
    const startedAt = Date.now();

    logRequest("info", "start", {
      method,
      url,
      timeout,
      data
    });

    wx.request({
      url,
      method,
      data,
      timeout,
      header: buildRequestHeaders(options),
      success(res) {
        const duration = Date.now() - startedAt;
        const requestId = getRequestId(res.header);

        try {
          const normalizedPayload = normalizePayload(res.data, res.statusCode);

          logRequest("info", "success", {
            method,
            url,
            statusCode: res.statusCode,
            duration,
            requestId
          });

          resolve(normalizedPayload);
        } catch (error) {
          logRequest("warn", "response-error", {
            method,
            url,
            statusCode: res.statusCode,
            duration,
            requestId,
            message: error.message,
            response: res.data
          });

          reject(error);
        }
      },
      fail(error) {
        const duration = Date.now() - startedAt;

        logRequest("warn", "fail", {
          method,
          url,
          duration,
          timeout,
          error: error && error.errMsg ? error.errMsg : error
        });

        reject(buildError(buildRequestFailMessage(error)));
      }
    });
  });
}

function buildQueryString(data) {
  return Object.keys(data || {}).reduce((segments, key) => {
    const value = data[key];

    if (value === undefined || value === null || value === "") {
      return segments;
    }

    segments.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    return segments;
  }, []).join("&");
}

function requestByCloud(options) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.callContainer) {
      reject(buildError("当前环境还没有可用的云托管调用能力"));
      return;
    }

    const queryString = buildQueryString(options.method === "GET" ? options.data : {});
    const path = `${envConfig.cloud.path}${options.url}${queryString ? `?${queryString}` : ""}`;

    wx.cloud.callContainer({
      config: {
        env: envConfig.cloud.env
      },
      path,
      method: options.method || "GET",
      header: buildRequestHeaders(options),
      data: options.method === "GET" ? undefined : (options.data || {}),
      success(res) {
        try {
          resolve(normalizePayload(res.data, res.statusCode));
        } catch (error) {
          reject(error);
        }
      },
      fail(error) {
        reject(buildError(error && error.errMsg ? error.errMsg : "云托管请求失败"));
      }
    });
  });
}

function request(options) {
  if (envConfig.requestTransport === "cloud") {
    return requestByCloud(options);
  }

  return requestByHttp(options);
}

function get(url, data, options = {}) {
  return request({
    ...options,
    url,
    data,
    method: "GET"
  });
}

function post(url, data, options = {}) {
  return request({
    ...options,
    url,
    data,
    method: "POST"
  });
}

function put(url, data, options = {}) {
  return request({
    ...options,
    url,
    data,
    method: "PUT"
  });
}

function del(url, data, options = {}) {
  return request({
    ...options,
    url,
    data,
    method: "DELETE"
  });
}

module.exports = {
  request,
  get,
  post,
  put,
  del
};
