# Módulos, menus e submenus

A cadeia abaixo do sistema continua obrigatória:

Sistema → Módulo → Menu → Submenu

Cada filho exige o pai e o nome é único dentro desse pai. Status é `ATIVADO` ou `DESATIVADO`. Descrição curta e longa são opcionais. A empresa não entra nestas tabelas.

`DELETE` exclui o nó quando ele não tem filho nem tela apontando para ele. Com vínculo, a resposta é 409 `delete_restricted`.

Operar estas rotas exige administrador ativo.

## Contrato

- `POST /v1/modulos` com `{ "nome", "sistemaId", "descricaoCurta?", "descricaoLonga?", "status?" }`.
- `POST /v1/menus` com `{ "nome", "moduloId", ... }`.
- `POST /v1/submenus` com `{ "nome", "menuId", ... }`.

Sem status, o padrão é `ATIVADO`. Resposta `201`.

A listagem aceita o id do pai na query: `sistemaId`, `moduloId` ou `menuId`. Os ids são inteiros.

`PATCH` altera ao menos um campo. Trocar o pai move o registro para outro pai existente.

## Erros

| Situação | HTTP | Corpo |
|---|---|---|
| Pai ausente no corpo | 400 | `validation_error` |
| Pai inexistente | 404 | `system_not_found`, `module_not_found` ou `menu_not_found` |
| Nome repetido no mesmo pai | 409 | `module_name_conflict`, `menu_name_conflict` ou `submenu_name_conflict` |
| Nó com filho ou tela | 409 | `delete_restricted` |
