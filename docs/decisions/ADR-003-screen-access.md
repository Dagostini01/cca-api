# ADR-003 — Acesso por tela no catálogo do stakeholder

**Status:** Aceita. Substitui o ADR-002.

**Decisão:** o sistema é um catálogo global. Ele não pertence a uma empresa. Módulo aponta para sistema, menu para módulo e submenu para menu. A empresa entra na linha de acesso, junto com o sistema, o módulo, o menu e o submenu.

Essa linha, em `t052_usuarios_acessos`, é a permissão: poder abrir aquela tela. Não há perfil e não há as ações visualizar, criar, editar e excluir.

A cadeia da linha tem de ser coerente. O submenu pertence ao menu informado, o menu ao módulo e o módulo ao sistema. Combinação quebrada é rejeitada.

**Motivo:** a consulta de exemplo e o script do stakeholder ligam o usuário a uma tela inteira. O ADR-002 tinha colocado a empresa como dona do sistema e tinha derivado a permissão de um perfil com quatro ações. Isso não é o modelo que o stakeholder descreveu.

**Consequências:**

- Identificadores da API são inteiros.
- Status é `ATIVADO` ou `DESATIVADO`, vindo de `t046_tp_status`.
- Operar o cadastro do CCA exige usuário local `ATIVADO` do tipo `ADMINITRADOR`. Enquanto não existir nenhum administrador, um token válido cria o primeiro.
- O administrador lista e altera os usuários que ele criou. Quem não tem autor pode ser alterado por qualquer administrador ativo.
- `POST /v1/usuarios` grava a pessoa e as telas na mesma transação.
- `t047_usuarios_senhas` existe para o schema bater com o script. Nenhuma rota lê, grava ou devolve senha ou hash. O login continua no Keycloak.
- `KEYCLOAK_SUB` e `ID_USUARIO_INCLUSAO` não estão no script. Sem elas a API não liga o token ao usuário nem filtra quem cada administrador criou.
