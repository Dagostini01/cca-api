# Usuários

O contrato executável está na referência Scalar, em `/docs/`. Esta página guarda a regra de negócio.

O usuário de negócio pertence a uma empresa. O login continua no Keycloak: esta tabela guarda o `sub`, o nome, o e-mail e o status. Não há senha, RG nem CPF. A API não cria o usuário no realm neste passo.

`keycloakSub` é um UUID, único e imutável. Um `sub` errado se corrige inativando o cadastro e criando outro. O e-mail é obrigatório, único e persistido em minúsculas. A empresa precisa existir. Não há exclusão física.

`GET /v1/me` continua devolvendo só as claims do token. O cadastro local do mesmo `sub` é `GET /v1/usuarios/eu`. Se ainda não houver linha, a resposta é 404. Essa consulta do próprio usuário não exige permissão de empresa. O catálogo de usuários segue `autorizacao.md`.

## Rotas

Todas exigem Bearer token.

- `POST /v1/usuarios` com `{ "nome", "email", "keycloakSub", "empresaId", "status?" }`. Sem status, o padrão é `ATIVO`. Resposta `201`.
- `GET /v1/usuarios` lista por nome. `?empresaId=` restringe à empresa.
- `GET /v1/usuarios/eu` devolve o usuário cujo `keycloakSub` é o `sub` do token.
- `GET /v1/usuarios/:id`
- `PATCH /v1/usuarios/:id` altera ao menos um campo entre `nome`, `email`, `empresaId` e `status`. Trocar `empresaId` exige que a empresa de destino exista.

## Erros

| Situação | HTTP | `error` |
| --- | --- | --- |
| Empresa inexistente | 404 | `company_not_found` |
| Usuário inexistente, inclusive em `/eu` | 404 | `user_not_found` |
| E-mail já usado | 409 | `user_email_conflict` |
| `sub` já usado | 409 | `user_subject_conflict` |
| JSON inválido, id inválido, corpo vazio ou campo desconhecido | 400 | `validation_error` |
| Nome, e-mail ou `sub` rejeitados pela regra de domínio | 400 | `invalid_user_name`, `invalid_user_email` ou `invalid_user_subject` |
