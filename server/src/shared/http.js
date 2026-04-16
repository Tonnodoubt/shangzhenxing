const crypto = require("crypto");
const INTERNAL_ERROR_MESSAGE = "服务暂时开小差了，请稍后再试";

function createRequestId(prefix = "API") {
  const uuid = crypto.randomUUID().slice(0, 8);
  return `${prefix}-${uuid}`;
}

function sendData(res, data, options = {}) {
  res.status(options.statusCode || 200).json({
    code: 0,
    message: options.message || "ok",
    data,
    requestId: options.requestId || createRequestId()
  });
}

function sendError(res, message, options = {}) {
  res.status(options.statusCode || 400).json({
    code: options.code || 50000,
    message: message || "服务异常",
    data: null,
    requestId: options.requestId || createRequestId()
  });
}

function sendCaughtError(res, error, options = {}) {
  const statusCode = Number(options.statusCode || (error && error.statusCode) || 500) || 500;
  const requestId = options.requestId || "";
  const isInternalError = statusCode >= 500;
  const message = isInternalError
    ? INTERNAL_ERROR_MESSAGE
    : String(options.message || ((error && error.message) || "服务异常")).trim() || "服务异常";

  if (error) {
    const errorLabel = requestId ? `[request:${requestId}]` : "[request:unknown]";
    const errorPayload = error && error.stack ? error.stack : error;
    const logger = isInternalError ? console.error : console.warn;

    logger(`${errorLabel} ${isInternalError ? "internal-error" : "request-error"}`, errorPayload);
  }

  sendError(res, message, {
    code: options.code || (error && error.code) || undefined,
    statusCode,
    requestId
  });
}

function wrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  createRequestId,
  sendData,
  sendError,
  sendCaughtError,
  wrap
};
