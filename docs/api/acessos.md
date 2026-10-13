# Acessos

O contrato executável está na referência Scalar, em `/docs/`. Esta página guarda a regra de negócio.

Um acesso liga um usuário de negócio a um perfil dentro de um sistema. Os três precisam ser da mesma empresa. O par usuário + sistema é único: outro sistema da mesma empresa pode receber outro perfil. Usuário e sistema não mudam depois da criação. Trocar o perfil exige que o novo perfil seja da mesma empresa. Não há exclusão física: `status: "INATIVO"` tira o vínculo de uso.

Esta rota grava o vínculo. O primeiro acesso ativo liga a autorização descrita em `autorizacao.md`.

## Rotas

Todas exigem Bearer token.

- `POST /v1/acessos` com `{ "usuarioId", "perfilId", "sistemaId", "status?" }`. Sem status, o padrão é `ATIVO`. Resposta `201`.
- `GET /v1/acessos` lista por sistema e usuário. `?usuarioId=` e `?sistemaId=` podem ser usados juntos ou separados.
- `GET /v1/acessos/:id`
- `PATCH /v1/acessos/:id` altera ao menos um campo entre `perfilId` e `status`.

## Erros

| Situação | HTTP | `error` |
| --- | --- | --- |
| Usuário inexistente | 404 | `user_not_found` |
| Perfil inexistente | 404 | `profile_not_found` |
| Sistema inexistente | 404 | `system_not_found` |
| Acesso inexistente | 404 | `access_not_found` |
| O usuário já tem acesso nesse sistema | 409 | `access_conflict` |
| Usuário, perfil ou sistema de empresas diferentes | 409 | `access_company_mismatch` |
| JSON inválido ou corpo vazio | 400 | `validation_error` |
