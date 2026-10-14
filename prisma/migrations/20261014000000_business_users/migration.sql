-- CreateTable
CREATE TABLE `usuarios` (
    `id` CHAR(36) NOT NULL,
    `keycloak_sub` CHAR(36) NOT NULL,
    `nome` VARCHAR(128) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `empresa_id` CHAR(36) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_keycloak_sub_key`(`keycloak_sub`),
    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- O Prisma schema não representa CHECK. Senha, RG e CPF não entram nesta tabela.
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_nome_nao_vazio` CHECK (char_length(trim(`nome`)) > 0);
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_email_nao_vazio` CHECK (char_length(trim(`email`)) > 0);
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_sub_nao_vazio` CHECK (char_length(trim(`keycloak_sub`)) > 0);
