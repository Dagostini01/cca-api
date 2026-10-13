# Protótipo de telas

Fonte visual: `datasite-central-controle.html`, na raiz do workspace. É referência de navegação e de campos. Não é contrato da API e não acopla o CCA a um sistema consumidor.

## Telas

Login, recuperação e redefinição de senha ficam no Keycloak. O Fastify não implementa esses formulários.

O shell autenticado cobre:

- Visão geral.
- Empresas, com CNPJ e status.
- Sistemas vinculados a uma empresa.
- Módulos, menus e submenus, na hierarquia empresa → sistema → módulo → menu → submenu.
- Usuários, com nome, e-mail, empresa e status, além da ficha de acessos.
- Permissões por recurso, com as ações visualizar, criar, editar e excluir.
- Perfis reutilizáveis, com nome, descrição e status.
- Auditoria, com data e hora, usuário, ação e descrição.

Os nomes de exemplo no HTML, como sistemas e pessoas, são dados de demonstração.
