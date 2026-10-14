-- CreateTable
CREATE TABLE `perfis` (
    `id` CHAR(36) NOT NULL,
    `empresa_id` CHAR(36) NOT NULL,
    `nome` VARCHAR(128) NOT NULL,
    `descricao` VARCHAR(512) NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `perfis_empresa_id_nome_key`(`empresa_id`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `perfis` ADD CONSTRAINT `perfis_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- O Prisma schema não representa CHECK. Permissões e o vínculo com usuário ficam fora desta tabela.
ALTER TABLE `perfis` ADD CONSTRAINT `perfis_nome_nao_vazio` CHECK (char_length(trim(`nome`)) > 0);
ALTER TABLE `perfis` ADD CONSTRAINT `perfis_descricao_nao_vazia` CHECK (`descricao` IS NULL OR char_length(trim(`descricao`)) > 0);
