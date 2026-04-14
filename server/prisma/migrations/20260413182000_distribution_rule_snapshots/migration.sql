-- AlterTable
ALTER TABLE `Order`
    ADD COLUMN `ruleVersionId` VARCHAR(191) NULL,
    ADD COLUMN `levelTwoInviterUserId` VARCHAR(191) NULL,
    ADD COLUMN `levelTwoCommissionRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    ADD COLUMN `levelTwoCommissionAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `CommissionRecord`
    ADD COLUMN `ruleVersionId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Order_levelTwoInviterUserId_createdAt_idx` ON `Order`(`levelTwoInviterUserId`, `createdAt`);
CREATE INDEX `Order_ruleVersionId_createdAt_idx` ON `Order`(`ruleVersionId`, `createdAt`);
CREATE INDEX `CommissionRecord_ruleVersionId_createdAt_idx` ON `CommissionRecord`(`ruleVersionId`, `createdAt`);

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_levelTwoInviterUserId_fkey` FOREIGN KEY (`levelTwoInviterUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Order` ADD CONSTRAINT `Order_ruleVersionId_fkey` FOREIGN KEY (`ruleVersionId`) REFERENCES `DistributionRuleVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CommissionRecord` ADD CONSTRAINT `CommissionRecord_ruleVersionId_fkey` FOREIGN KEY (`ruleVersionId`) REFERENCES `DistributionRuleVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
