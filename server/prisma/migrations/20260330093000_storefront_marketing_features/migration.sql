-- AlterTable
ALTER TABLE `Cart`
    ADD COLUMN `selectedCouponId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CouponTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `threshold` DECIMAL(10, 2) NOT NULL,
    `badge` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `issueType` ENUM('center_claim', 'manual_issue') NOT NULL DEFAULT 'center_claim',
    `validDays` INTEGER NOT NULL DEFAULT 7,
    `status` ENUM('enabled', 'disabled') NOT NULL DEFAULT 'enabled',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CouponTemplate_code_key`(`code`),
    INDEX `CouponTemplate_status_issueType_createdAt_idx`(`status`, `issueType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserCoupon` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `status` ENUM('available', 'used', 'expired') NOT NULL DEFAULT 'available',
    `sourceType` ENUM('center_claim', 'manual_issue', 'system_grant') NOT NULL DEFAULT 'center_claim',
    `sourceText` VARCHAR(191) NULL,
    `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `usedOrderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserCoupon_usedOrderId_key`(`usedOrderId`),
    INDEX `UserCoupon_userId_status_expiresAt_idx`(`userId`, `status`, `expiresAt`),
    INDEX `UserCoupon_userId_templateId_sourceType_idx`(`userId`, `templateId`, `sourceType`),
    INDEX `UserCoupon_templateId_status_idx`(`templateId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AfterSale` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `status` ENUM('processing', 'approved', 'rejected', 'done') NOT NULL DEFAULT 'processing',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AfterSale_orderId_key`(`orderId`),
    INDEX `AfterSale_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistributorProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL DEFAULT '普通分销员',
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `totalCommission` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `pendingCommission` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `settledCommission` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `teamCount` INTEGER NOT NULL DEFAULT 0,
    `todayInviteCount` INTEGER NOT NULL DEFAULT 0,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DistributorProfile_userId_key`(`userId`),
    INDEX `DistributorProfile_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamMember` (
    `id` VARCHAR(191) NOT NULL,
    `distributorId` VARCHAR(191) NOT NULL,
    `nickname` VARCHAR(191) NOT NULL,
    `avatarLabel` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL,
    `contributedAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeamMember_distributorId_joinedAt_idx`(`distributorId`, `joinedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommissionRecord` (
    `id` VARCHAR(191) NOT NULL,
    `distributorId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `fromUser` VARCHAR(191) NOT NULL,
    `orderNo` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `levelText` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'settled') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommissionRecord_distributorId_status_createdAt_idx`(`distributorId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cart` ADD CONSTRAINT `Cart_selectedCouponId_fkey` FOREIGN KEY (`selectedCouponId`) REFERENCES `UserCoupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCoupon` ADD CONSTRAINT `UserCoupon_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCoupon` ADD CONSTRAINT `UserCoupon_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `CouponTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCoupon` ADD CONSTRAINT `UserCoupon_usedOrderId_fkey` FOREIGN KEY (`usedOrderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AfterSale` ADD CONSTRAINT `AfterSale_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AfterSale` ADD CONSTRAINT `AfterSale_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistributorProfile` ADD CONSTRAINT `DistributorProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamMember` ADD CONSTRAINT `TeamMember_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `DistributorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommissionRecord` ADD CONSTRAINT `CommissionRecord_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `DistributorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
