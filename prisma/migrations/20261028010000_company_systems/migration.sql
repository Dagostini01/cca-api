-- Vínculo N:N entre empresa e sistema. As tabelas do stakeholder não mudam.
-- Cada sistema já concedido em uma tela fica ligado à empresa daquela tela.

CREATE TABLE `t012_empresas_sistemas` (
    `ID_EMPRESA` INTEGER NOT NULL,
    `ID_SISTEMA` INTEGER NOT NULL,
    `DT_INCLUSAO` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `t012_empresas_sistemas_ID_SISTEMA_idx`(`ID_SISTEMA`),
    PRIMARY KEY (`ID_EMPRESA`, `ID_SISTEMA`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `t012_empresas_sistemas` ADD CONSTRAINT `t012_empresas_sistemas_ID_EMPRESA_fkey` FOREIGN KEY (`ID_EMPRESA`) REFERENCES `t010_empresas`(`ID_EMPRESA`) ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE `t012_empresas_sistemas` ADD CONSTRAINT `t012_empresas_sistemas_ID_SISTEMA_fkey` FOREIGN KEY (`ID_SISTEMA`) REFERENCES `t025_sistemas`(`ID_SISTEMA`) ON DELETE CASCADE ON UPDATE RESTRICT;

INSERT INTO `t012_empresas_sistemas` (`ID_EMPRESA`, `ID_SISTEMA`)
SELECT DISTINCT `ID_EMPRESA`, `ID_SISTEMA` FROM `t052_usuarios_acessos`;
