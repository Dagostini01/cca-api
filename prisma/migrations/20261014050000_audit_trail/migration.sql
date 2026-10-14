-- Histórico das alterações da CCA. Não há atualização nem exclusão física.
-- As CHECK não estão no schema Prisma. Preservá-las se um migrate dev futuro tentar removê-las.
CREATE TABLE `auditorias` (
    `id` CHAR(36) NOT NULL,
    `ocorrido_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` CHAR(36) NULL,
    `usuario_nome` VARCHAR(128) NULL,
    `acao` ENUM('CRIAR', 'ATUALIZAR') NOT NULL,
    `recurso_tipo` ENUM('EMPRESA', 'SISTEMA', 'MODULO', 'MENU', 'SUBMENU', 'USUARIO', 'PERFIL', 'PERMISSAO', 'ACESSO') NOT NULL,
    `recurso_id` CHAR(36) NOT NULL,
    `descricao` VARCHAR(512) NOT NULL,
    `empresa_id` CHAR(36) NOT NULL,

    INDEX `auditorias_empresa_id_ocorrido_em_idx`(`empresa_id`, `ocorrido_em`),
    INDEX `auditorias_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `auditorias` ADD CONSTRAINT `auditorias_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `auditorias` ADD CONSTRAINT `auditorias_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `auditorias` ADD CONSTRAINT `auditorias_descricao_nao_vazia` CHECK (CHAR_LENGTH(TRIM(`descricao`)) > 0);
ALTER TABLE `auditorias` ADD CONSTRAINT `auditorias_usuario_coerente` CHECK (
    (`usuario_id` IS NULL AND `usuario_nome` IS NULL)
    OR (`usuario_id` IS NOT NULL AND `usuario_nome` IS NOT NULL AND CHAR_LENGTH(TRIM(`usuario_nome`)) > 0)
);
