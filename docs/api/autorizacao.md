# Autorização das rotas

O contrato executável está na referência Scalar, em `/docs/`. Esta página guarda a regra.

`GET /health` e `/docs` continuam públicos. `GET /v1/me` só lê as claims do token. `GET /v1/usuarios/eu` lê o usuário local daquele `sub` e responde 404 `user_not_found` quando a linha não existe. Essas duas rotas não consultam acesso nem permissão.

As demais rotas `/v1` exigem o Bearer token e, depois do primeiro acesso gravado, a ação correspondente.

## Trava inicial

Enquanto a tabela `acessos` não tem nenhuma linha, qualquer token válido chama as rotas autenticadas. O primeiro acesso gravado liga a autorização. Isso permite criar a primeira empresa, o primeiro usuário, o perfil, as permissões e o sistema antes de existir quem possa concedê-los.

A ordem prática, ainda com a tabela vazia:

1. empresa
2. sistema dessa empresa
3. usuário local com o `sub` do token
4. perfil da mesma empresa
5. permissão `EMPRESA` com visualizar, criar e editar
6. permissão `SISTEMA` sobre o sistema já criado
7. acesso ativo ligando usuário, perfil e sistema

A partir desse acesso, token sem usuário local ativo recebe 403 `forbidden`. Usuário inativo também. A API não registra o `sub`.

## O que uma concessão cobre

Um acesso ativo aplica as permissões do perfil somente nos recursos daquele sistema e da empresa dele. Vários acessos ativos se somam. Perfil inativo ou acesso inativo não entra. A ação no pai não vale para o filho: visualizar o sistema não visualiza o módulo.

`excluir` continua gravado e não há rota de exclusão física, então essa ação não é consultada.

Consulta por id carrega o registro primeiro. Se ele não existe, a resposta segue o 404 daquele recurso. Se existe e a ação falta, a resposta é 403 `forbidden`. Na criação, o pai ausente continua 404. Pai existente sem a ação é 403.

Listas devolvem só o que o chamador pode visualizar. Sem nenhum item visível, a resposta é 200 com lista vazia.

## Ação por rota

| Rota | Ação |
| --- | --- |
| `POST /v1/empresas` | `criar` em ao menos uma `EMPRESA` que o chamador já administra. Na trava inicial, qualquer token válido cria a primeira. |
| `GET` e `PATCH /v1/empresas/:id` | `visualizar` ou `editar` nessa `EMPRESA` |
| `GET /v1/empresas` | só as empresas com `visualizar` |
| `POST /v1/sistemas` | `criar` na `EMPRESA` do corpo |
| `GET` e `PATCH /v1/sistemas/:id` | `visualizar` ou `editar` nesse `SISTEMA` |
| `POST /v1/modulos` | `criar` no `SISTEMA` pai |
| `GET` e `PATCH` de módulo, menu ou submenu | `visualizar` ou `editar` naquele nó |
| `POST /v1/menus` | `criar` no `MODULO` pai |
| `POST /v1/submenus` | `criar` no `MENU` pai |
| `POST`, `GET` e `PATCH` de usuários, perfis, permissões e acessos | `criar`, `visualizar` ou `editar` na `EMPRESA` dona do cadastro |
| `GET /v1/auditorias` | `visualizar` na `EMPRESA` de cada evento. A lista omite o resto |

Mover um usuário ou um perfil para outra empresa exige `editar` na empresa atual e na empresa de destino. Mover um sistema exige `editar` no sistema e `editar` na empresa de destino. Mover módulo, menu ou submenu exige `editar` no nó e `criar` no novo pai.

Administrar permissão ou acesso usa a empresa do perfil ou do usuário, não um recurso separado da CCA.
