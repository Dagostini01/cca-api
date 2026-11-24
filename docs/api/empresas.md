# Empresas

Empresa é `t010_empresas`. O identificador é inteiro. O campo principal é `razaoSocial`. Também entram nome fantasia, nome reduzido, CNPJ, data de constituição e status `ATIVADO` ou `DESATIVADO`.

O sistema não pertence à empresa. A empresa aparece na linha de acesso da tela.

`DELETE /v1/empresas/:id` exclui a empresa quando ela não tem tela, endereço nem contato. A resposta é 204. Com vínculo, a resposta é 409 `delete_restricted`. A exclusão da empresa não grava evento `EXCLUIR`. `status: "DESATIVADO"` no PATCH tira a empresa de uso sem apagar o cadastro.

Operar estas rotas exige usuário local `ATIVADO` do tipo `ADMINITRADOR`. Enquanto não existir nenhum administrador, um token válido opera o cadastro.

## Contrato

```json
{ "razaoSocial": "Alfa", "cnpj": "11.222.333/0001-81", "status": "ATIVADO" }
```

`cnpj`, `nomeFantasia`, `nomeReduzido`, `dataConstituicao` e `status` são opcionais. Sem `status`, o padrão é `ATIVADO`. `cnpj` pode ser `null`. Quando informado, a API valida os dígitos e grava só os 14 números. A resposta não devolve a máscara.

- `POST /v1/empresas` cria. Resposta `201`.
- `GET /v1/empresas` lista por razão social.
- `GET /v1/empresas/:id` lê uma empresa.
- `PATCH /v1/empresas/:id` altera ao menos um campo. `cnpj: null` remove o documento.
- `DELETE /v1/empresas/:id` responde `204` sem corpo.

`:id` é inteiro positivo. Texto no lugar do id responde 400 `validation_error`.

## Erros

| Situação | HTTP | Corpo |
|---|---|---|
| Sem Bearer | 401 | `{ "error": "unauthorized" }` |
| Token inválido | 401 | `{ "error": "invalid_token" }` |
| Quem chama não é administrador ativo | 403 | `{ "error": "forbidden" }` |
| Corpo inválido | 400 | `{ "error": "validation_error", "issues": [...] }` |
| CNPJ já gravado | 409 | `{ "error": "company_document_conflict" }` |
| Id inexistente | 404 | `{ "error": "company_not_found" }` |
| Empresa com tela, endereço ou contato | 409 | `{ "error": "delete_restricted" }` |

O corpo de validação não inclui o valor recebido. Log não recebe CNPJ.
