-- AlterTable
ALTER TABLE `DistributorProfile`
  ADD COLUMN `withdrawableCommission` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `withdrawingCommission` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `withdrawnCommission` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `CommissionRecord`
  MODIFY COLUMN `status` ENUM('pending', 'settled', 'withdrawing', 'withdrawn', 'reversed') NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE `WithdrawalRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requestNo` VARCHAR(191) NOT NULL,
    `distributorId` VARCHAR(191) NOT NULL,
    `status` ENUM('submitted', 'approved', 'rejected', 'paying', 'paid', 'pay_failed', 'cancelled') NOT NULL DEFAULT 'submitted',
    `amount` DECIMAL(10, 2) NOT NULL,
    `serviceFee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `netAmount` DECIMAL(10, 2) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'manual_bank',
    `accountName` VARCHAR(191) NULL,
    `accountNoMask` VARCHAR(191) NULL,
    `remark` LONGTEXT NULL,
    `reviewRemark` LONGTEXT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WithdrawalRequest_requestNo_key`(`requestNo`),
    INDEX `WithdrawalRequest_distributorId_status_createdAt_idx`(`distributorId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WithdrawalRequestItem` (
    `id` VARCHAR(191) NOT NULL,
    `withdrawalRequestId` VARCHAR(191) NOT NULL,
    `commissionRecordId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WithdrawalRequestItem_commissionRecordId_key`(`commissionRecordId`),
    INDEX `WithdrawalRequestItem_withdrawalRequestId_createdAt_idx`(`withdrawalRequestId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WithdrawalPayout` (
    `id` VARCHAR(191) NOT NULL,
    `withdrawalRequestId` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'manual_bank',
    `channelBillNo` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'paid',
    `remark` LONGTEXT NULL,
    `paidBy` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WithdrawalPayout_withdrawalRequestId_createdAt_idx`(`withdrawalRequestId`, `createdAt`),
    INDEX `WithdrawalPayout_channelBillNo_idx`(`channelBillNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WithdrawalRequest` ADD CONSTRAINT `WithdrawalRequest_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `DistributorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalRequestItem` ADD CONSTRAINT `WithdrawalRequestItem_withdrawalRequestId_fkey` FOREIGN KEY (`withdrawalRequestId`) REFERENCES `WithdrawalRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalRequestItem` ADD CONSTRAINT `WithdrawalRequestItem_commissionRecordId_fkey` FOREIGN KEY (`commissionRecordId`) REFERENCES `CommissionRecord`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WithdrawalPayout` ADD CONSTRAINT `WithdrawalPayout_withdrawalRequestId_fkey` FOREIGN KEY (`withdrawalRequestId`) REFERENCES `WithdrawalRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
