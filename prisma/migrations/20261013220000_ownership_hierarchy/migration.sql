-- CreateTable
CREATE TABLE `empresas` (
    `id` CHAR(36) NOT NULL,
    `nome` VARCHAR(128) NOT NULL,
    `cnpj` VARCHAR(20) NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `empresas_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sistemas` (
    `id` CHAR(36) NOT NULL,
    `empresa_id` CHAR(36) NOT NULL,
    `nome` VARCHAR(128) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sistemas_empresa_id_nome_key`(`empresa_id`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modulos` (
    `id` CHAR(36) NOT NULL,
    `sistema_id` CHAR(36) NOT NULL,
    `nome` VARCHAR(128) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `modulos_sistema_id_nome_key`(`sistema_id`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menus` (
    `id` CHAR(36) NOT NULL,
    `modulo_id` CHAR(36) NOT NULL,
    `nome` VARCHAR(128) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `menus_modulo_id_nome_key`(`modulo_id`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submenus` (
    `id` CHAR(36) NOT NULL,
    `menu_id` CHAR(36) NOT NULL,
    `nome` VARCHAR(128) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `submenus_menu_id_nome_key`(`menu_id`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sistemas` ADD CONSTRAINT `sistemas_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `modulos` ADD CONSTRAINT `modulos_sistema_id_fkey` FOREIGN KEY (`sistema_id`) REFERENCES `sistemas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `menus` ADD CONSTRAINT `menus_modulo_id_fkey` FOREIGN KEY (`modulo_id`) REFERENCES `modulos`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `submenus` ADD CONSTRAINT `submenus_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Nome obrigatório de fato. O Prisma schema não representa CHECK.
ALTER TABLE `empresas` ADD CONSTRAINT `empresas_nome_nao_vazio` CHECK (char_length(trim(`nome`)) > 0);
ALTER TABLE `empresas` ADD CONSTRAINT `empresas_cnpj_nao_vazio` CHECK (`cnpj` IS NULL OR char_length(trim(`cnpj`)) > 0);
ALTER TABLE `sistemas` ADD CONSTRAINT `sistemas_nome_nao_vazio` CHECK (char_length(trim(`nome`)) > 0);
ALTER TABLE `modulos` ADD CONSTRAINT `modulos_nome_nao_vazio` CHECK (char_length(trim(`nome`)) > 0);
ALTER TABLE `menus` ADD CONSTRAINT `menus_nome_nao_vazio` CHECK (char_length(trim(`nome`)) > 0);
ALTER TABLE `submenus` ADD CONSTRAINT `submenus_nome_nao_vazio` CHECK (char_length(trim(`nome`)) > 0);
