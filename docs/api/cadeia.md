# Módulos, menus e submenus

O contrato executável está na referência Scalar, em `/docs/`. Cada nível só existe ligado ao pai imediato.

| Recurso | Pai obrigatório | Nome único dentro do pai |
| --- | --- | --- |
| `POST /v1/modulos` | `sistemaId` | sistema |
| `POST /v1/menus` | `moduloId` | módulo |
| `POST /v1/submenus` | `menuId` | menu |

A listagem aceita o id do pai na query: `sistemaId`, `moduloId` ou `menuId`. Sem status, o padrão é `ATIVO`. Não há exclusão física; `INATIVO` preserva os filhos.

Pai inexistente responde `404` com `system_not_found`, `module_not_found` ou `menu_not_found`, conforme o nível. Nome repetido no mesmo pai responde `409` com `module_name_conflict`, `menu_name_conflict` ou `submenu_name_conflict`. O mesmo nome pode existir em pais diferentes.
