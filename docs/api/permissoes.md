# Permissões

O contrato executável está na referência Scalar, em `/docs/`. Esta página guarda a regra de negócio.

Uma permissão liga um perfil a um recurso e marca as ações visualizar, criar, editar e excluir. O recurso é uma empresa, um sistema, um módulo, um menu ou um submenu. No nó da cadeia, a empresa não entra no corpo: ela é a empresa do sistema ancestral. Em `EMPRESA`, o recurso é o id da empresa. Nos dois casos, precisa ser a mesma empresa do perfil. Um perfil da empresa A não aponta para um recurso da empresa B.

O par perfil + recurso é único. Perfil e recurso não mudam depois da criação. Na criação, pelo menos uma ação precisa ser verdadeira. Na atualização, as quatro podem ficar falsas; a linha permanece. Não há exclusão física.

Estas rotas gravam a concessão. Quem pode chamá-las, e como a concessão passa a valer nas outras rotas, está em `autorizacao.md`. O vínculo do usuário com o perfil e o sistema está em `/v1/acessos`.

## Rotas

Todas exigem Bearer token.

- `POST /v1/permissoes` com `{ "perfilId", "recursoTipo", "recursoId", "visualizar", "criar", "editar", "excluir" }`. `recursoTipo` é `EMPRESA`, `SISTEMA`, `MODULO`, `MENU` ou `SUBMENU`. Resposta `201`.
- `GET /v1/permissoes` lista por tipo de recurso. `?perfilId=` restringe ao perfil.
- `GET /v1/permissoes/:id`
- `PATCH /v1/permissoes/:id` altera ao menos uma ação. Não aceita `perfilId`, `recursoTipo` nem `recursoId`.

## Erros

| Situação | HTTP | `error` |
| --- | --- | --- |
| Perfil inexistente | 404 | `profile_not_found` |
| Recurso inexistente ou fora da cadeia | 404 | `resource_not_found` |
| Permissão inexistente | 404 | `permission_not_found` |
| O mesmo perfil já tem esse recurso | 409 | `permission_conflict` |
| O recurso pertence a outra empresa | 409 | `permission_company_mismatch` |
| Nenhuma ação verdadeira na criação, JSON inválido ou corpo vazio | 400 | `validation_error` |
