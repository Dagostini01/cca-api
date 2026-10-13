# Testes

`npm test` cobre `GetCurrentUser`, a cadeia empresa → submenu, o usuário de negócio, o perfil, a permissão, o acesso, a autorização das rotas e os endpoints `/health`, `/docs`, `/v1/me`, `/v1/empresas`, `/v1/sistemas`, `/v1/modulos`, `/v1/menus`, `/v1/submenus`, `/v1/usuarios`, `/v1/perfis`, `/v1/permissoes` e `/v1/acessos` via `app.inject`. Os repositórios desses testes ficam em memória. A autorização só entra quando o teste passa o autorizador.

Esses testes não sobem Docker, não abrem o MySQL e não validam um access token real do Keycloak.
