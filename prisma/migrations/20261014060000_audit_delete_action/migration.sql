-- A exclusão de cadastro passa a poder ser registrada. As CHECK existentes permanecem.
ALTER TABLE `auditorias` MODIFY `acao` ENUM('CRIAR', 'ATUALIZAR', 'EXCLUIR') NOT NULL;
