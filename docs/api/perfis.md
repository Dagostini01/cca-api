# Perfis

O contrato executável está na referência Scalar, em `/docs/`. Esta página guarda a regra de negócio.

Um perfil só existe ligado a uma empresa. O nome é único dentro dela; outra empresa pode repetir o mesmo nome. A comparação segue a collation do banco, sem diferenciar maiúsculas. A descrição é opcional e some quando o texto, depois do recorte, fica vazio. Não há exclusão física.

As ações visualizar, criar, editar e excluir ficam em `/v1/permissoes`, ligadas a este perfil e a uma empresa ou a um nó da cadeia. O usuário entra nesse perfil por `/v1/acessos`. A autorização das rotas está em `autorizacao.md`.

## Rotas

Todas exigem Bearer token.

- `POST /v1/perfis` com `{ "nome", "descricao?", "empresaId", "status?" }`. Sem status, o padrão é `ATIVO`. Sem descrição, o campo fica nulo. Resposta `201`.
- `GET /v1/perfis` lista por nome. `?empresaId=` restringe à empresa.
- `GET /v1/perfis/:id`
- `PATCH /v1/perfis/:id` altera ao menos um campo entre `nome`, `descricao`, `empresaId` e `status`. `descricao: null` apaga o texto. Trocar `empresaId` move o perfil para outra empresa existente.

## Erros

| Situação | HTTP | `error` |
| --- | --- | --- |
| Empresa inexistente | 404 | `company_not_found` |
| Perfil inexistente | 404 | `profile_not_found` |
| Nome repetido na mesma empresa | 409 | `profile_name_conflict` |
| JSON inválido, id inválido ou corpo vazio | 400 | `validation_error` |
