require("dotenv").config();

const express = require("express");
const path = require("path");
const adminRouter = require("./admin/router");
const { createRequestId } = require("./admin/http");
const { createStorefrontService } = require("./modules/storefront/service");
const { createStorefrontRouter } = require("./modules/storefront/router");

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 3000);
const runtimeState = {
  ready: true,
  startupPhase: "ready",
  startupMessage: ""
};

function sendError(res, message, statusCode = 500) {
  res.status(statusCode).json({
    success: false,
    message
  });
}

function setRuntimeState(nextState = {}) {
  runtimeState.ready = typeof nextState.ready === "boolean" ? nextState.ready : runtimeState.ready;
  runtimeState.startupPhase = String(nextState.startupPhase || runtimeState.startupPhase || "ready");
  runtimeState.startupMessage = String(nextState.startupMessage || "");
}

const storefrontService = createStorefrontService();

app.use(express.json());
app.use((req, res, next) => {
  const requestPrefix = req.path.startsWith("/admin/") ? "ADMIN" : "API";

  req.requestId = createRequestId(requestPrefix);
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

storefrontService.bootstrap();

app.use("/admin-console", express.static(path.join(__dirname, "../public/admin-console")));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      ok: runtimeState.ready,
      service: "wechat-mini-shop-server",
      storefrontRepositoryMode: storefrontService.getRepositoryMode(),
      startupPhase: runtimeState.startupPhase,
      startupMessage: runtimeState.startupMessage
    }
  });
});

app.use((req, res, next) => {
  if (runtimeState.ready) {
    next();
    return;
  }

  sendError(res, runtimeState.startupMessage || "服务启动中，请稍后再试。", 503);
});

app.use(createStorefrontRouter({
  storefrontService
}));
app.use(adminRouter);

app.use((req, res) => {
  sendError(res, "接口不存在", 404);
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
