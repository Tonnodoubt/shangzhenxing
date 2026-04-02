const envConfig = require("../config/env");
const sessionStore = require("./session");

const STARTUP_RETRY_MESSAGE_PATTERNS = [
  "prisma migrations are still running",
  "please retry shortly",
  "服务启动中",
  "请稍后再试"
];
const STARTUP_RETRY_MAX_ATTEMPTS = 6;
const STARTUP_RETRY_DELAY_MS = 500;

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

function normalizeError(error, extra = {}) {
  const normalizedError = error instanceof Error
    ? error
    : buildError(error && error.message ? error.message : String(error || "请求失败"));

  Object.keys(extra || {}).forEach((key) => {
    normalizedError[key] = extra[key];
  });

  return normalizedError;
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

function getStartupRetryConfig(options = {}) {
  const startupRetry = options.startupRetry || {};

  return {
    enabled: startupRetry.enabled !== false,
    maxAttempts: Math.max(1, Number(startupRetry.maxAttempts || STARTUP_RETRY_MAX_ATTEMPTS)),
    delayMs: Math.max(0, Number(startupRetry.delayMs || STARTUP_RETRY_DELAY_MS))
  };
}

function shouldRetryStartup503(error) {
  if (Number((error || {}).statusCode || 0) !== 503) {
    return false;
  }

  const message = String((error || {}).message || "").trim().toLowerCase();

  if (!message) {
    return false;
  }

  return STARTUP_RETRY_MESSAGE_PATTERNS.some((pattern) => message.indexOf(pattern.toLowerCase()) > -1);
}

function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(delayMs || 0)));
  });
}

async function requestWithStartupRetry(executor, context = {}) {
  const retryConfig = getStartupRetryConfig(context.options);
  let attempt = 0;

  while (attempt < retryConfig.maxAttempts) {
    attempt += 1;

    try {
      return await executor(attempt);
    } catch (error) {
      const normalizedError = normalizeError(error);

      if (!retryConfig.enabled || attempt >= retryConfig.maxAttempts || !shouldRetryStartup503(normalizedError)) {
        throw normalizedError;
      }

      const delayMs = retryConfig.delayMs * attempt;
      const retryPayload = {
        method: context.method,
        attempt,
        nextAttempt: attempt + 1,
        maxAttempts: retryConfig.maxAttempts,
        delayMs,
        message: normalizedError.message
      };

      if (context.url) {
        retryPayload.url = context.url;
      }

      if (context.path) {
        retryPayload.path = context.path;
      }

      logRequest("warn", context.retryStage || "startup-retry", retryPayload);

      await wait(delayMs);
    }
  }

  return null;
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

function getCloudServiceName() {
  return String(((envConfig.cloud || {}).service) || "").trim();
}

function requestByHttp(options) {
  const method = options.method || "GET";
  const url = `${envConfig.apiBaseUrl}${options.url}`;
  const data = options.data || {};
  const timeout = options.timeout || envConfig.requestTimeout;

  return requestWithStartupRetry((attempt) => new Promise((resolve, reject) => {
    const startedAt = Date.now();

    logRequest("info", "start", {
      method,
      url,
      timeout,
      data,
      attempt
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
            requestId,
            attempt
          });

          resolve(normalizedPayload);
        } catch (error) {
          const normalizedError = normalizeError(error, {
            statusCode: Number(res.statusCode || 0),
            requestId,
            response: res.data
          });
          const shouldRetry = shouldRetryStartup503(normalizedError);

          logRequest(shouldRetry ? "info" : "warn", shouldRetry ? "response-retryable" : "response-error", {
            method,
            url,
            statusCode: res.statusCode,
            duration,
            requestId,
            message: normalizedError.message,
            response: res.data,
            attempt
          });

          reject(normalizedError);
        }
      },
      fail(error) {
        const duration = Date.now() - startedAt;
        const normalizedError = buildError(buildRequestFailMessage(error));

        logRequest("warn", "fail", {
          method,
          url,
          duration,
          timeout,
          error: error && error.errMsg ? error.errMsg : error,
          attempt
        });

        reject(normalizedError);
      }
    });
  }), {
    options,
    method,
    url,
    retryStage: "startup-retry"
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

function joinCloudPath(basePath, requestPath) {
  const normalizedBasePath = String(basePath || "").trim();
  const normalizedRequestPath = String(requestPath || "").trim();

  if (!normalizedBasePath) {
    return normalizedRequestPath || "/";
  }

  if (!normalizedRequestPath) {
    return normalizedBasePath;
  }

  if (normalizedRequestPath === normalizedBasePath) {
    return normalizedRequestPath;
  }

  if (
    normalizedBasePath !== "/"
    && normalizedRequestPath.startsWith(`${normalizedBasePath}/`)
  ) {
    return normalizedRequestPath;
  }

  if (normalizedBasePath === "/") {
    return normalizedRequestPath.startsWith("/")
      ? normalizedRequestPath
      : `/${normalizedRequestPath}`;
  }

  const trimmedBasePath = normalizedBasePath.replace(/\/+$/, "");
  const trimmedRequestPath = normalizedRequestPath.replace(/^\/+/, "");

  return `${trimmedBasePath}/${trimmedRequestPath}`;
}

function requestByCloud(options) {
  if (!wx.cloud || !wx.cloud.callContainer) {
    return Promise.reject(buildError("当前环境还没有可用的云托管调用能力"));
  }

  const serviceName = getCloudServiceName();

  if (!serviceName) {
    return Promise.reject(buildError("cloud.service 未配置，当前无法定位云托管服务"));
  }

  const method = options.method || "GET";
  const queryString = buildQueryString(method === "GET" ? options.data : {});
  const requestPath = joinCloudPath((envConfig.cloud || {}).path, options.url);
  const path = `${requestPath}${queryString ? `?${queryString}` : ""}`;
  const data = method === "GET" ? undefined : (options.data || {});
  const timeout = options.timeout || envConfig.requestTimeout;
  const header = {
    ...buildRequestHeaders(options),
    "X-WX-SERVICE": serviceName
  };

  return requestWithStartupRetry((attempt) => new Promise((resolve, reject) => {
    const startedAt = Date.now();

    logRequest("info", "cloud-start", {
      method,
      env: envConfig.cloud.env,
      service: serviceName,
      path,
      timeout,
      data: options.data || {},
      attempt
    });

    wx.cloud.callContainer({
      config: {
        env: envConfig.cloud.env
      },
      path,
      method,
      header,
      data,
      timeout,
      success(res) {
        const duration = Date.now() - startedAt;

        try {
          const normalizedPayload = normalizePayload(res.data, res.statusCode);

          logRequest("info", "cloud-success", {
            method,
            path,
            statusCode: res.statusCode,
            duration,
            attempt
          });

          resolve(normalizedPayload);
        } catch (error) {
          const normalizedError = normalizeError(error, {
            statusCode: Number(res.statusCode || 0),
            response: res.data
          });
          const shouldRetry = shouldRetryStartup503(normalizedError);

          logRequest(shouldRetry ? "info" : "warn", shouldRetry ? "cloud-response-retryable" : "cloud-response-error", {
            method,
            path,
            statusCode: res.statusCode,
            duration,
            message: normalizedError.message,
            response: res.data,
            attempt
          });

          reject(normalizedError);
        }
      },
      fail(error) {
        const duration = Date.now() - startedAt;
        const normalizedError = buildError(error && error.errMsg ? error.errMsg : "云托管请求失败");

        logRequest("warn", "cloud-fail", {
          method,
          path,
          duration,
          timeout,
          error: error && error.errMsg ? error.errMsg : error,
          attempt
        });

        reject(normalizedError);
      }
    });
  }), {
    options,
    method,
    path,
    retryStage: "cloud-startup-retry"
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
