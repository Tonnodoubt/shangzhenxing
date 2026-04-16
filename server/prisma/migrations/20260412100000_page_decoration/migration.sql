-- CreateTable
CREATE TABLE `Banner` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `linkType` VARCHAR(191) NOT NULL DEFAULT 'none',
    `linkValue` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'enabled',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Banner_status_sortOrder_idx`(`status`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageSection` (
    `id` VARCHAR(191) NOT NULL,
    `sectionKey` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `config` MEDIUMTEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PageSection_sectionKey_key`(`sectionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreTheme` (
    `id` VARCHAR(191) NOT NULL,
    `themeKey` VARCHAR(191) NOT NULL,
    `themeValue` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StoreTheme_themeKey_key`(`themeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default page sections
INSERT INTO `PageSection` (`id`, `sectionKey`, `sortOrder`, `visible`, `updatedAt`) VALUES
    (SUBSTRING(MD5(RAND()), 1, 25), 'hero', 0, true, NOW(3)),
    (SUBSTRING(MD5(RAND()), 1, 25), 'categories', 1, true, NOW(3)),
    (SUBSTRING(MD5(RAND()), 1, 25), 'benefit', 2, true, NOW(3)),
    (SUBSTRING(MD5(RAND()), 1, 25), 'feature', 3, true, NOW(3)),
    (SUBSTRING(MD5(RAND()), 1, 25), 'products', 4, true, NOW(3));

-- Seed default theme
INSERT INTO `StoreTheme` (`id`, `themeKey`, `themeValue`, `updatedAt`) VALUES
    (SUBSTRING(MD5(RAND()), 1, 25), 'primary_color', '#6ea893', NOW(3));
