-- CreateTable
CREATE TABLE `PaymentOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `orderNo` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'mock',
    `status` VARCHAR(191) NOT NULL DEFAULT 'prepared',
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'CNY',
    `paymentNo` VARCHAR(191) NULL,
    `mockToken` VARCHAR(191) NULL,
    `preparedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `requestPayloadJson` MEDIUMTEXT NULL,
    `resultPayloadJson` MEDIUMTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentOrder_orderId_key`(`orderId`),
    UNIQUE INDEX `PaymentOrder_orderNo_key`(`orderNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `PaymentOrder_userId_status_createdAt_idx` ON `PaymentOrder`(`userId`, `status`, `createdAt`);
CREATE INDEX `PaymentOrder_orderNo_createdAt_idx` ON `PaymentOrder`(`orderNo`, `createdAt`);
