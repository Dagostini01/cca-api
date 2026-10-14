-- CreateTable
CREATE TABLE `permissoes` (
    `id` CHAR(36) NOT NULL,
    `perfil_id` CHAR(36) NOT NULL,
    `recurso_tipo` ENUM('SISTEMA', 'MODULO', 'MENU', 'SUBMENU') NOT NULL,
    `sistema_id` CHAR(36) NULL,
    `modulo_id` CHAR(36) NULL,
    `menu_id` CHAR(36) NULL,
    `submenu_id` CHAR(36) NULL,
    `visualizar` BOOLEAN NOT NULL,
    `criar` BOOLEAN NOT NULL,
    `editar` BOOLEAN NOT NULL,
    `excluir` BOOLEAN NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissoes_perfil_id_sistema_id_key`(`perfil_id`, `sistema_id`),
    UNIQUE INDEX `permissoes_perfil_id_modulo_id_key`(`perfil_id`, `modulo_id`),
    UNIQUE INDEX `permissoes_perfil_id_menu_id_key`(`perfil_id`, `menu_id`),
    UNIQUE INDEX `permissoes_perfil_id_submenu_id_key`(`perfil_id`, `submenu_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `permissoes` ADD CONSTRAINT `permissoes_perfil_id_fkey` FOREIGN KEY (`perfil_id`) REFERENCES `perfis`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `permissoes` ADD CONSTRAINT `permissoes_sistema_id_fkey` FOREIGN KEY (`sistema_id`) REFERENCES `sistemas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `permissoes` ADD CONSTRAINT `permissoes_modulo_id_fkey` FOREIGN KEY (`modulo_id`) REFERENCES `modulos`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `permissoes` ADD CONSTRAINT `permissoes_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `permissoes` ADD CONSTRAINT `permissoes_submenu_id_fkey` FOREIGN KEY (`submenu_id`) REFERENCES `submenus`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- O Prisma schema não representa CHECK. A empresa não é gravada aqui: ela sai do ancestral do recurso.
ALTER TABLE `permissoes` ADD CONSTRAINT `permissoes_um_recurso` CHECK (
    (`recurso_tipo` = 'SISTEMA' AND `sistema_id` IS NOT NULL AND `modulo_id` IS NULL AND `menu_id` IS NULL AND `submenu_id` IS NULL)
    OR (`recurso_tipo` = 'MODULO' AND `modulo_id` IS NOT NULL AND `sistema_id` IS NULL AND `menu_id` IS NULL AND `submenu_id` IS NULL)
    OR (`recurso_tipo` = 'MENU' AND `menu_id` IS NOT NULL AND `sistema_id` IS NULL AND `modulo_id` IS NULL AND `submenu_id` IS NULL)
    OR (`recurso_tipo` = 'SUBMENU' AND `submenu_id` IS NOT NULL AND `sistema_id` IS NULL AND `modulo_id` IS NULL AND `menu_id` IS NULL)
);
