# Testes

`npm test` cobre `GetCurrentUser`, a cadeia sistema → submenu, o usuário de negócio, o provisionamento no diretório com um falso em memória, o acesso por tela, a autorização do administrador e da tela, a auditoria, a exclusão dos cadastros, a importação do catálogo legado, o CORS das origens locais e os endpoints `/health`, `/docs`, `/v1/me`, `/v1/empresas`, `/v1/sistemas`, `/v1/modulos`, `/v1/menus`, `/v1/submenus`, `/v1/usuarios`, `/v1/acessos`, `/v1/auditorias` e `/v1/importacoes/legado` via `app.inject`. Os repositórios desses testes ficam em memória. A autorização, o registro de auditoria e o diretório de identidade só entram quando o teste passa esses serviços.

Esses testes não sobem Docker, não abrem o MySQL e não validam um access token real do Keycloak.
