# Sistemas

O contrato executável está na referência Scalar, em `/docs/`. Esta página guarda a regra de negócio.

Um sistema só existe ligado a uma empresa. `empresaId` é obrigatório na criação e precisa ser o id de uma empresa já cadastrada. O nome é único dentro da empresa; outra empresa pode repetir o mesmo nome. A comparação segue a collation do banco, sem diferenciar maiúsculas.

Não há exclusão física. `status: "INATIVO"` tira o sistema de uso e preserva os módulos que vierem a existir.

## Rotas

Todas exigem Bearer token.

- `POST /v1/sistemas` com `{ "nome", "empresaId", "status?" }`. Sem status, o padrão é `ATIVO`. Resposta `201`.
- `GET /v1/sistemas` lista por nome. `?empresaId=` restringe à empresa.
- `GET /v1/sistemas/:id`
- `PATCH /v1/sistemas/:id` altera ao menos um campo entre `nome`, `empresaId` e `status`. Trocar `empresaId` move o sistema para outra empresa existente.

## Erros

| Situação | HTTP | `error` |
| --- | --- | --- |
| Empresa inexistente | 404 | `company_not_found` |
| Sistema inexistente | 404 | `system_not_found` |
| Nome repetido na mesma empresa | 409 | `system_name_conflict` |
| JSON inválido, id inválido ou corpo vazio | 400 | `validation_error` |
