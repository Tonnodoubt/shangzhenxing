require("dotenv").config();

const express = require("express");
const path = require("path");
const adminRouter = require("./admin/router");
const { createRequestId, sendCaughtError, sendData, sendError } = require("./shared/http");
const { createStorefrontService } = require("./modules/storefront/service");
const { createStorefrontRouter } = require("./modules/storefront/router");

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const runtimeState = {
  ready: true,
  startupPhase: "ready",
  startupMessage: ""
};

function setRuntimeState(nextState = {}) {
  runtimeState.ready = typeof nextState.ready === "boolean" ? nextState.ready : runtimeState.ready;
  runtimeState.startupPhase = String(nextState.startupPhase || runtimeState.startupPhase || "ready");
  runtimeState.startupMessage = String(nextState.startupMessage || "");
}

const storefrontService = createStorefrontService();

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://127.0.0.1:3000,http://localhost:3000")
  .split(",").map((s) => s.trim()).filter(Boolean);

app.use(express.json());
app.use((req, res, next) => {
  const requestPrefix = req.path.startsWith("/admin/") ? "ADMIN" : "API";

  req.requestId = createRequestId(requestPrefix);
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin || "";

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Token, X-Admin-Token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

storefrontService.bootstrap();

app.use("/admin-console", express.static(path.join(__dirname, "../public/admin-console")));

app.get("/health", (req, res) => {
  sendData(res, { ok: runtimeState.ready }, {
    requestId: req.requestId
  });
});

app.use((req, res, next) => {
  if (runtimeState.ready) {
    next();
    return;
  }

  sendError(res, runtimeState.startupMessage || "服务启动中，请稍后再试。", {
    statusCode: 503,
    requestId: req.requestId
  });
});

app.use(createStorefrontRouter({
  storefrontService
}));
app.use(adminRouter);

app.use((req, res) => {
  sendError(res, "接口不存在", {
    statusCode: 404,
    requestId: req.requestId
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  sendCaughtError(res, error, {
    requestId: req.requestId
  });
});

function startServer(port = DEFAULT_PORT) {
  const server = app.listen(port, () => {
    const address = server.address();
    const resolvedPort = address && typeof address === "object" ? address.port : port;

    console.log(`wechat-mini-shop-server listening on http://127.0.0.1:${resolvedPort}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  setRuntimeState
};
