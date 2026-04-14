const { sendError } = require("./http");

function normalizePositiveInt(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getClientIp(req = {}) {
  const headers = req.headers || {};
  const forwardedFor = String(headers["x-forwarded-for"] || "").trim();

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0];

    if (firstIp && firstIp.trim()) {
      return firstIp.trim();
    }
  }

  return String(req.ip || (req.socket && req.socket.remoteAddress) || "unknown").trim() || "unknown";
}

function createRateLimiter(options = {}) {
  const keyPrefix = String(options.keyPrefix || "api").trim() || "api";
  const windowMs = normalizePositiveInt(options.windowMs, 10 * 60 * 1000);
  const max = normalizePositiveInt(options.max, 60);
  const code = normalizePositiveInt(options.code, 42900);
  const statusCode = normalizePositiveInt(options.statusCode, 429);
  const message = String(options.message || "请求过于频繁，请稍后再试").trim() || "请求过于频繁，请稍后再试";
  const keyBy = typeof options.keyBy === "function" ? options.keyBy : null;
  const skip = typeof options.skip === "function" ? options.skip : null;
  const bucket = new Map();
  const cleanupTimer = setInterval(() => {
    const now = Date.now();

    for (const [key, record] of bucket) {
      if (!record || now > Number(record.resetAt || 0)) {
        bucket.delete(key);
      }
    }
  }, Math.min(windowMs, 60 * 1000));

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    if (skip && skip(req)) {
      next();
      return;
    }

    const keyPart = keyBy ? String(keyBy(req) || "").trim() : "";
    const source = keyPart || getClientIp(req);
    const key = `${keyPrefix}:${source}`;
    const now = Date.now();
    const current = bucket.get(key);

    if (!current || now > current.resetAt) {
      bucket.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      next();
      return;
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

      res.setHeader("Retry-After", String(retryAfter));
      sendError(res, message, {
        code,
        statusCode,
        requestId: req.requestId
      });
      return;
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  getClientIp
};
