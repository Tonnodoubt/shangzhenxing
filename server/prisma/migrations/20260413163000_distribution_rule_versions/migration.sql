-- CreateTable
CREATE TABLE `DistributionRuleVersion` (
    `id` VARCHAR(191) NOT NULL,
    `versionNo` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `levelOneRate` DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
    `levelTwoRate` DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
    `bindDays` INTEGER NOT NULL DEFAULT 15,
    `minWithdrawalAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `serviceFeeRate` DECIMAL(6, 4) NOT NULL DEFAULT 0.0000,
    `serviceFeeFixed` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `ruleDesc` LONGTEXT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `effectiveAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `publishedBy` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DistributionRuleVersion_versionNo_key`(`versionNo`),
    INDEX `DistributionRuleVersion_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistributionRuleChangeLog` (
    `id` VARCHAR(191) NOT NULL,
    `ruleVersionId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NULL,
    `payloadJson` MEDIUMTEXT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DistributionRuleChangeLog_ruleVersionId_createdAt_idx`(`ruleVersionId`, `createdAt`),
    INDEX `DistributionRuleChangeLog_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DistributionRuleChangeLog` ADD CONSTRAINT `DistributionRuleChangeLog_ruleVersionId_fkey` FOREIGN KEY (`ruleVersionId`) REFERENCES `DistributionRuleVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
