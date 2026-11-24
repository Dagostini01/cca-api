# Auditoria

Cada criação, atualização ou exclusão de cadastro grava uma linha em `t070_auditorias`. `DS_AUDITORIA` é a descrição, no máximo 128 caracteres. `DS_CURTA` guarda o tipo do recurso: `EMPRESA`, `SISTEMA`, `MODULO`, `MENU`, `SUBMENU`, `USUARIO` ou `ACESSO`. `ID_TP_AUDITORIA` é 1 `CRIAR`, 2 `ATUALIZAR` ou 3 `EXCLUIR`. `ID_USUARIO` é quem fez, quando esse usuário já existe localmente.

Não há `POST`, `PATCH` nem `DELETE` de auditoria. O cliente não grava, corrige nem apaga o histórico por essa rota. A exclusão de empresa não grava `EXCLUIR`. A exclusão do próprio usuário, quando o `sub` do token é o dele, também não grava `EXCLUIR`, para a linha nova não impedir o delete. Consulta não gera linha.

Login e logout ficam no Keycloak. `DT_LOGIN`, `DT_LOGOUT` e `TM_SSO` permanecem vazios.

A consulta exige administrador ativo, com a mesma abertura inicial do restante do cadastro. A resposta traz id, data, usuário, ação, recurso e descrição. Não traz `sub`, e-mail, RG, CPF nem celular.

## Contrato

- `GET /v1/auditorias` lista do mais novo para o mais antigo. Filtros opcionais: `usuarioId`, `recursoTipo`, `acao`, `desde`, `ate`.
- `GET /v1/auditorias/:id` lê um evento. Id inexistente responde 404 `audit_not_found`.
