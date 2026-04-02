-- CreateTable
CREATE TABLE `ReferralBinding` (
    `id` VARCHAR(191) NOT NULL,
    `inviterUserId` VARCHAR(191) NOT NULL,
    `inviteeUserId` VARCHAR(191) NOT NULL,
    `sourceScene` VARCHAR(191) NOT NULL DEFAULT 'share',
    `boundAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReferralBinding_inviteeUserId_key`(`inviteeUserId`),
    INDEX `ReferralBinding_inviterUserId_boundAt_idx`(`inviterUserId`, `boundAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Order`
  ADD COLUMN `referralBindingId` VARCHAR(191) NULL,
  ADD COLUMN `inviterUserId` VARCHAR(191) NULL,
  ADD COLUMN `sourceScene` VARCHAR(191) NULL,
  ADD COLUMN `commissionBaseAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `commissionRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN `commissionAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- CreateIndex
CREATE INDEX `Order_inviterUserId_createdAt_idx` ON `Order`(`inviterUserId`, `createdAt`);

-- AddForeignKey
ALTER TABLE `ReferralBinding` ADD CONSTRAINT `ReferralBinding_inviterUserId_fkey` FOREIGN KEY (`inviterUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralBinding` ADD CONSTRAINT `ReferralBinding_inviteeUserId_fkey` FOREIGN KEY (`inviteeUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_referralBindingId_fkey` FOREIGN KEY (`referralBindingId`) REFERENCES `ReferralBinding`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_inviterUserId_fkey` FOREIGN KEY (`inviterUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
