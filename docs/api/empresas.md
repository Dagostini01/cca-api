# Empresas

O contrato executável está na referência Scalar, em `/docs/`. Esta página guarda a regra que o schema não expressa sozinho.

Rotas autenticadas. O token é o mesmo access token do `GET /v1/me`. Sem token, a resposta é `401 unauthorized`. Token inválido: `401 invalid_token`. Falha ao consultar o JWKS: `503 token_verifier_unavailable`.

`DELETE /v1/empresas/:id` exclui a empresa quando ela não tem sistema, usuário, perfil nem permissão. A resposta é 204. Com vínculo, a resposta é 409 `delete_restricted` e nada é apagado. O histórico dessa empresa sai junto. `status: "INATIVO"` no PATCH continua tirando a empresa de uso sem apagar a cadeia.

O CNPJ é opcional. Quando informado, os dígitos verificadores são validados e somente os 14 dígitos são persistidos. A resposta não devolve a máscara enviada.

## `POST /v1/empresas`

Corpo:

```json
{ "nome": "Alfa", "cnpj": "11.222.333/0001-81", "status": "ATIVO" }
```

`cnpj` e `status` são opcionais. Sem `status`, o padrão é `ATIVO`. `cnpj` pode ser `null`.

Resposta `201`: `id`, `nome`, `cnpj`, `status`, `criadoEm`, `atualizadoEm`.

## `GET /v1/empresas`

Resposta `200`: array ordenado por `nome`.

## `GET /v1/empresas/:id`

Resposta `200` com a empresa, ou `404 company_not_found`.

## `PATCH /v1/empresas/:id`

Corpo parcial com ao menos um campo entre `nome`, `cnpj` e `status`. `cnpj: null` remove o documento.

Resposta `200` com a empresa atualizada.

## `DELETE /v1/empresas/:id`

Resposta `204` sem corpo quando a empresa não tem sistema, usuário, perfil nem permissão. O histórico dela sai junto.

## Erros de entrada e conflito

| Situação | HTTP | Corpo |
| --- | --- | --- |
| JSON com tipo, tamanho, campo desconhecido ou CNPJ inválido | 400 | `{ "error": "validation_error", "issues": [{ "path": "cnpj", "code": "custom" }] }` |
| Atualização sem campos | 400 | `{ "error": "validation_error", "issues": [...] }` |
| `id` que não é UUID | 400 | `{ "error": "validation_error", "issues": [...] }` |
| CNPJ já usado por outra empresa | 409 | `{ "error": "company_document_conflict" }` |
| Empresa inexistente | 404 | `{ "error": "company_not_found" }` |
| Empresa com sistema, usuário, perfil ou permissão | 409 | `{ "error": "delete_restricted" }` |

`issues` traz `path` e `code`. Não inclui o valor recebido.
