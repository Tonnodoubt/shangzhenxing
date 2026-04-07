-- AlterTable
ALTER TABLE `Order`
  ADD COLUMN `snapReceiver` VARCHAR(191) NULL,
  ADD COLUMN `snapPhone` VARCHAR(191) NULL,
  ADD COLUMN `snapAddress` VARCHAR(191) NULL;
