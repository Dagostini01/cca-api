# Protótipo de telas

Fonte visual: `datasite-central-controle.html`, na raiz do workspace. É referência de navegação e de campos. Não é contrato da API e não acopla o CCA a um sistema consumidor.

## Telas

Login, recuperação e redefinição de senha ficam no Keycloak. O Fastify não implementa esses formulários.

O shell autenticado cobre:

- Visão geral.
- Empresas, com CNPJ e status.
- Sistemas, módulos, menus e submenus. No HTML o sistema aparece dentro da empresa; na API o sistema é catálogo global e a empresa entra na tela do usuário. Ver ADR-003.
- Usuários, com nome, e-mail e status, além das telas concedidas na criação.
- Auditoria, com data e hora, usuário, ação e descrição.

O HTML ainda desenha perfil e as ações visualizar, criar, editar e excluir. Isso não é o contrato vigente da API.

Os nomes de exemplo no HTML, como sistemas e pessoas, são dados de demonstração.
