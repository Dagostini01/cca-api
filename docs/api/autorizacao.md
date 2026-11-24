# Autorização

O Keycloak autentica. A CCA decide o que o usuário local pode operar.

Operar o cadastro (empresa, sistema, cadeia, usuários, telas, auditoria e importação) exige usuário local `ATIVADO` do tipo `ADMINITRADOR`.

Enquanto não existir nenhum administrador, de qualquer status, um token válido opera o cadastro. Isso substitui a trava antiga de “zero acessos libera tudo”. Um conjunto só de administradores desativados fecha o cadastro: a abertura inicial não volta.

Supervisor não ganha o cadastro geral. A tela que ele pode abrir é uma linha `ATIVADO` em `t052_usuarios_acessos` para aquele submenu.

`GET /v1/me`, `/health` e `/docs` não consultam esse cadastro. `GET /v1/usuarios/eu` devolve o próprio usuário do token.

O administrador lista e altera os usuários cujo `criadoPorId` é o dele. Usuário sem autor, como o importado ou o primeiro, pode ser administrado por qualquer administrador ativo.

Não há perfil e não há ações visualizar, criar, editar e excluir.

## Rotas

| Rota | Regra |
|---|---|
| `GET /health`, `GET /docs`, `GET /v1/me` | Sem cadastro local |
| `GET /v1/usuarios/eu` | O usuário do token |
| Cadastro de empresa, sistema, cadeia, auditoria e importação | Administrador ativo, ou abertura inicial |
| `GET /v1/usuarios` | Usuários criados pelo administrador do token |
| `GET /v1/usuarios/:id/telas` | O próprio usuário ativo, ou o administrador que pode geri-lo |
| `POST`, `PATCH` e `DELETE` de usuário e de acesso | O administrador que pode gerir aquele usuário |
| `GET /v1/acessos/:id` | O dono ativo da linha, se a tela estiver `ATIVADO`, ou o administrador que pode geri-lo |
