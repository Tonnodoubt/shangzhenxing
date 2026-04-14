const { createStorefrontMemoryRepository } = require("./memory");
const { createStorefrontPrismaRepository } = require("./prisma");
const { createMockStorefrontSource } = require("../../mock");

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

  return createStorefrontMemoryRepository(createMockStorefrontSource());
}

module.exports = {
  createStorefrontRepository,
  resolveStorefrontRepositoryMode
};
