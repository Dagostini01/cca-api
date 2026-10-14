# Auditoria

O contrato executável está na referência Scalar, em `/docs/`. Esta página guarda a regra de negócio.

A auditoria é o histórico das alterações feitas nesta API. Cada linha guarda a data e hora, o usuário local quando ele existe, a ação, o recurso e uma descrição curta. A tela de referência mostra esses campos.

Não há `POST` nem `PATCH`. O cliente não grava nem corrige o histórico. A API registra `CRIAR` e `ATUALIZAR` depois que o cadastro é gravado. Consulta não gera linha. Login e logout ficam no Keycloak e não entram aqui.

A descrição é o nome do cadastro. Na permissão, é o tipo do recurso. No acesso, é a palavra `acesso`. E-mail e `sub` não são gravados. Se o token ainda não tem usuário local, `usuarioId` e `usuarioNome` ficam nulos. Quando o usuário existe, o nome é a cópia daquele momento.

A empresa da linha é a empresa do recurso alterado. A lista devolve só as empresas que o chamador pode visualizar. Sem nenhum acesso gravado, qualquer token válido vê o histórico.

## Rotas

Todas exigem Bearer token.

- `GET /v1/auditorias` lista da mais recente para a mais antiga. `?empresaId=`, `?usuarioId=`, `?recursoTipo=`, `?desde=` e `?ate=` podem ser combinados. `desde` e `ate` são datas ISO sobre `ocorridoEm`.
- `GET /v1/auditorias/:id`

## Erros

| Situação | HTTP | `error` |
| --- | --- | --- |
| Evento inexistente | 404 | `audit_not_found` |
| Evento de uma empresa que o chamador não visualiza | 403 | `forbidden` |
| Data ou identificador inválido | 400 | `validation_error` |
