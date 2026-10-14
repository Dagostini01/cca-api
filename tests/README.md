# Testes

`npm test` cobre `GetCurrentUser`, a cadeia empresa → submenu, o usuário de negócio, o provisionamento no diretório com um falso em memória, o perfil, a permissão, o acesso, a autorização das rotas, a auditoria e os endpoints `/health`, `/docs`, `/v1/me`, `/v1/empresas`, `/v1/sistemas`, `/v1/modulos`, `/v1/menus`, `/v1/submenus`, `/v1/usuarios`, `/v1/perfis`, `/v1/permissoes`, `/v1/acessos` e `/v1/auditorias` via `app.inject`. Os repositórios desses testes ficam em memória. A autorização, o registro de auditoria e o diretório de identidade só entram quando o teste passa esses serviços.

Esses testes não sobem Docker, não abrem o MySQL e não validam um access token real do Keycloak.
