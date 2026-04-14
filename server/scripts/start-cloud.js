const path = require("path");
const net = require("node:net");
const { spawn } = require("node:child_process");
const dotenv = require("dotenv");
const {
  readRuntimeEnv,
  assertRuntimeEnv
} = require("../src/config/env");

dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

const SERVER_DIR = path.resolve(__dirname, "..");
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
let activeServer = null;

function normalizeDatabaseUrl(value) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^[\s"'`“”‘’]+|[\s"'`“”‘’]+$/g, "");
}

function readDatabaseTarget(databaseUrl) {
  try {
    const url = new URL(databaseUrl);

    return {
      host: url.hostname || "127.0.0.1",
      port: url.port ? Number(url.port) : 3306,
      database: url.pathname.replace(/^\//, "") || "(unknown-db)"
    };
  } catch (error) {
    return null;
  }
}

function summarizeDatabaseTarget(databaseUrl) {
  const target = readDatabaseTarget(databaseUrl);

  if (!target) {
    return "(invalid DATABASE_URL)";
  }

  return `${target.host}:${target.port}/${target.database}`;
}

function probeDatabaseTcp(target, timeoutMs) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = net.createConnection({
      host: target.host,
      port: target.port
    });
    let settled = false;

    function finish(result) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve({
        ...result,
        host: target.host,
        port: target.port,
        timeoutMs,
        duration: Date.now() - startedAt
      });
    }

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      finish({
        ok: true,
        message: "TCP connection established"
      });
    });
    socket.once("timeout", () => {
      finish({
        ok: false,
        errorCode: "TIMEOUT",
        message: `Timed out after ${timeoutMs}ms`
      });
    });
    socket.once("error", (error) => {
      finish({
        ok: false,
        errorCode: error && error.code ? error.code : "SOCKET_ERROR",
        message: error && error.message ? error.message : String(error || "Unknown socket error")
      });
    });
  });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: SERVER_DIR,
      env: {
        ...process.env
      },
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (Number(code || 0) === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function main() {
  const runtimeEnv = readRuntimeEnv(process.env);
  const { config } = assertRuntimeEnv({
    config: runtimeEnv,
    strict: true,
    context: "cloud-start"
  });
  const storefrontMode = config.storefrontDataSource;
  const serverPort = config.port;
  const databaseTcpProbeTimeoutMs = Math.max(500, Number(config.databaseTcpProbeTimeoutMs || 2000));

  console.log(`[cloud-start] storefront mode: ${storefrontMode}`);

  const { startServer, setRuntimeState } = require("../src/index");

  if (storefrontMode === "prisma") {
    setRuntimeState({
      ready: false,
      startupPhase: "migrating",
      startupMessage: "Prisma migrations are still running. Please retry shortly."
    });
  }

  activeServer = startServer(serverPort);

  if (storefrontMode === "prisma") {
    const databaseUrl = normalizeDatabaseUrl(config.databaseUrl);
    const startedAt = Date.now();

    if (!databaseUrl) {
      throw new Error("缺少 DATABASE_URL，当前无法在云托管执行 prisma migrate deploy。");
    }

    process.env.DATABASE_URL = databaseUrl;

    const databaseTarget = readDatabaseTarget(databaseUrl);

    if (!databaseTarget) {
      throw new Error("DATABASE_URL 格式无效，当前无法解析数据库主机和端口。");
    }

    console.log(
      `[cloud-start] probing database tcp ${databaseTarget.host}:${databaseTarget.port}`
      + ` timeout=${databaseTcpProbeTimeoutMs}ms`
    );

    const probeResult = await probeDatabaseTcp(databaseTarget, databaseTcpProbeTimeoutMs);

    if (!probeResult.ok) {
      throw new Error(
        `数据库 TCP 探测失败 ${probeResult.host}:${probeResult.port}`
        + ` code=${probeResult.errorCode || "UNKNOWN"}`
        + ` duration=${probeResult.duration}ms`
        + ` message=${probeResult.message}`
      );
    }

    console.log(
      `[cloud-start] database tcp probe ok for ${probeResult.host}:${probeResult.port}`
      + ` in ${probeResult.duration}ms`
    );

    console.log(`[cloud-start] running prisma migrate deploy for ${summarizeDatabaseTarget(databaseUrl)}`);

    await runCommand(NPM_COMMAND, ["run", "prisma:migrate:deploy"]);
    console.log(`[cloud-start] prisma migrate deploy completed in ${Date.now() - startedAt}ms`);

    setRuntimeState({
      ready: true,
      startupPhase: "ready",
      startupMessage: ""
    });
  } else {
    console.log("[cloud-start] skipping prisma migrate deploy because STOREFRONT_DATA_SOURCE=memory");
    setRuntimeState({
      ready: true,
      startupPhase: "ready",
      startupMessage: ""
    });
  }
}

main().catch((error) => {
  console.error("[cloud-start] failed:", error && error.message ? error.message : error);

  if (activeServer) {
    activeServer.close(() => {
      process.exit(1);
    });

    setTimeout(() => {
      process.exit(1);
    }, 1000).unref();
    return;
  }

  process.exit(1);
});
