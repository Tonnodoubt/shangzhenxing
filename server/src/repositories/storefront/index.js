const { createStorefrontMemoryRepository } = require("./memory");
const { createStorefrontPrismaRepository } = require("./prisma");

function resolveStorefrontRepositoryMode() {
  const requestedMode = String(process.env.STOREFRONT_DATA_SOURCE || "memory").trim().toLowerCase();

  if (requestedMode === "prisma") {
    return "prisma";
  }

  return "memory";
}

function createStorefrontRepository() {
  const mode = resolveStorefrontRepositoryMode();

  if (mode === "prisma") {
    return createStorefrontPrismaRepository();
  }

  return createStorefrontMemoryRepository();
}

module.exports = {
  createStorefrontRepository,
  resolveStorefrontRepositoryMode
};
