-- AlterTable
ALTER TABLE `Order`
  ADD COLUMN `shipmentCompanyCode` VARCHAR(191) NULL,
  ADD COLUMN `shipmentCompanyName` VARCHAR(191) NULL,
  ADD COLUMN `shipmentTrackingNo` VARCHAR(191) NULL,
  ADD COLUMN `shippedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `AfterSale`
  ADD COLUMN `reviewRemark` LONGTEXT NULL,
  ADD COLUMN `reviewedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewedBy` VARCHAR(191) NULL;
