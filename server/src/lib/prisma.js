const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const globalForPrisma = global;

function buildAdapterConfig(databaseUrl) {
  const url = new URL(databaseUrl);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username || ""),
    password: decodeURIComponent(url.password || ""),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: url.searchParams.get("sslaccept")
      ? {
          rejectUnauthorized: false
        }
      : undefined
  };
}

function createPrismaClient() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();

  if (!databaseUrl) {
    throw new Error("缺少 DATABASE_URL，暂时无法初始化 Prisma Client。");
  }

  const adapter = new PrismaMariaDb(buildAdapterConfig(databaseUrl));

  return new PrismaClient({
    adapter
  });
}

function getPrismaClient() {
  if (!globalForPrisma.__wechatMiniShopPrisma) {
    globalForPrisma.__wechatMiniShopPrisma = createPrismaClient();
  }

  return globalForPrisma.__wechatMiniShopPrisma;
}

module.exports = {
  getPrismaClient
};
