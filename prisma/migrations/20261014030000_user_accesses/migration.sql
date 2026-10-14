-- CreateTable
CREATE TABLE `acessos` (
    `id` CHAR(36) NOT NULL,
    `usuario_id` CHAR(36) NOT NULL,
    `perfil_id` CHAR(36) NOT NULL,
    `sistema_id` CHAR(36) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `acessos_usuario_id_sistema_id_key`(`usuario_id`, `sistema_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `acessos` ADD CONSTRAINT `acessos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `acessos` ADD CONSTRAINT `acessos_perfil_id_fkey` FOREIGN KEY (`perfil_id`) REFERENCES `perfis`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `acessos` ADD CONSTRAINT `acessos_sistema_id_fkey` FOREIGN KEY (`sistema_id`) REFERENCES `sistemas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- A empresa não é coluna. Usuário, perfil e sistema precisam ser da mesma empresa, e isso é regra da aplicação.
