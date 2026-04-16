/**
 * 启动时自动同步 schema 变更。
 * 幂等执行：字段/表已存在则跳过，不中断启动。
 */
async function autoMigrate(prisma) {
  // 清理 prisma migrations 表中标记为失败的记录（dirty state）
  await cleanDirtyMigrations(prisma);

  const migrations = [
    "ALTER TABLE `ProductSku` ADD COLUMN `image` VARCHAR(191) NULL",
    "CREATE TABLE IF NOT EXISTS `AdminSession` (`id` VARCHAR(191) NOT NULL, `adminUserId` VARCHAR(191) NOT NULL, `sessionToken` VARCHAR(191) NOT NULL, `permissions` TEXT NOT NULL, `roleCodes` TEXT NOT NULL, `dataScopes` TEXT NOT NULL, `expiresAt` DATETIME(3) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), UNIQUE INDEX `AdminSession_sessionToken_key`(`sessionToken`), INDEX `AdminSession_sessionToken_idx`(`sessionToken`), INDEX `AdminSession_expiresAt_idx`(`expiresAt`), PRIMARY KEY (`id`)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  ];

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (error) {
      const msg = String((error && error.message) || "");
      if (msg.includes("Duplicate column") || msg.includes("already exists")) {
        continue;
      }
      console.warn("[auto-migrate] skipped:", msg);
    }
  }

  console.log("[auto-migrate] schema sync done");
}

async function cleanDirtyMigrations(prisma) {
  const dirtyMigrations = [
    "20260416100000_add_sku_image"
  ];

  for (const name of dirtyMigrations) {
    try {
      await prisma.$executeRawUnsafe(
        "DELETE FROM `_prisma_migrations` WHERE `migration_name` = '" + name + "'"
      );
    } catch (error) {
      // _prisma_migrations 表不存在则跳过
    }
  }
}

module.exports = { autoMigrate };
