-- Permissão sobre a empresa: cadastros fora da cadeia e criação de outro sistema.
-- A CHECK permissoes_um_recurso não está no schema Prisma. Preservá-la se um migrate dev futuro tentar removê-la.
ALTER TABLE `permissoes` ADD COLUMN `empresa_id` CHAR(36) NULL;

ALTER TABLE `permissoes` ADD CONSTRAINT `permissoes_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE UNIQUE INDEX `permissoes_perfil_id_empresa_id_key` ON `permissoes`(`perfil_id`, `empresa_id`);

ALTER TABLE `permissoes` MODIFY `recurso_tipo` ENUM('SISTEMA', 'MODULO', 'MENU', 'SUBMENU', 'EMPRESA') NOT NULL;

ALTER TABLE `permissoes` DROP CHECK `permissoes_um_recurso`;

ALTER TABLE `permissoes` ADD CONSTRAINT `permissoes_um_recurso` CHECK (
    (`recurso_tipo` = 'EMPRESA' AND `empresa_id` IS NOT NULL AND `sistema_id` IS NULL AND `modulo_id` IS NULL AND `menu_id` IS NULL AND `submenu_id` IS NULL)
    OR (`recurso_tipo` = 'SISTEMA' AND `sistema_id` IS NOT NULL AND `empresa_id` IS NULL AND `modulo_id` IS NULL AND `menu_id` IS NULL AND `submenu_id` IS NULL)
    OR (`recurso_tipo` = 'MODULO' AND `modulo_id` IS NOT NULL AND `empresa_id` IS NULL AND `sistema_id` IS NULL AND `menu_id` IS NULL AND `submenu_id` IS NULL)
    OR (`recurso_tipo` = 'MENU' AND `menu_id` IS NOT NULL AND `empresa_id` IS NULL AND `sistema_id` IS NULL AND `modulo_id` IS NULL AND `submenu_id` IS NULL)
    OR (`recurso_tipo` = 'SUBMENU' AND `submenu_id` IS NOT NULL AND `empresa_id` IS NULL AND `sistema_id` IS NULL AND `modulo_id` IS NULL AND `menu_id` IS NULL)
);
