const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

const { getPrismaClient } = require("../src/lib/prisma");
const { seedStorefrontCatalog } = require("../src/repositories/storefront/prisma-seeds");

async function main() {
  const prisma = getPrismaClient();
  const summary = await seedStorefrontCatalog(prisma);

  console.log(
    `[storefront-seed] completed: ${summary.categoryCount} categories, ${summary.productCount} products, ${summary.skuCount} skus`
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("[storefront-seed] failed:", error && error.message ? error.message : error);

  try {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error("[storefront-seed] disconnect failed:", disconnectError && disconnectError.message
      ? disconnectError.message
      : disconnectError);
  }

  process.exitCode = 1;
});
